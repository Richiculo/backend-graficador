import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { RelationType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { randomUUID } from 'crypto'

@Injectable()
export class UmlRelationsService {
  constructor(private prisma: PrismaService) {}

  // ───────── helpers ─────────
  private isMany(mult?: string | null) {
    if (!mult) return false
    return mult.includes('*')
  }

  private assertNMIfAssociation(associationClassId?: number | null, src?: string, tgt?: string) {
    if (associationClassId == null) return
    const isNM = this.isMany(src) && this.isMany(tgt)
    if (!isNM) throw new BadRequestException('associationClassId solo aplica cuando la relación es N–M (ambos extremos con "*").')
  }

  private async ensureSameDiagram(diagramId: number, ...classIds: number[]) {
    const rows = await this.prisma.umlClass.findMany({
      where: { id: { in: classIds } },
      select: { id: true, diagramId: true },
    })
    if (rows.length !== classIds.length) throw new NotFoundException('Alguna clase no existe.')
    const allSame = rows.every(r => r.diagramId === diagramId)
    if (!allSame) throw new BadRequestException('Todas las clases deben pertenecer al mismo diagrama.')
  }

  private async ensureRelation(id: number) {
    const r = await this.prisma.umlRelation.findUnique({ where: { id } })
    if (!r) throw new NotFoundException('Relation not found')
    return r
  }

  // ───────── CRUD ─────────
  async create(
    diagramId: number,
    dto: {
      kind: RelationType
      sourceClassId: number; targetClassId: number
      sourceMult: string; targetMult: string
      sourceRole?: string; targetRole?: string
      navigableAToB?: boolean; navigableBToA?: boolean
      associationClassId?: number | null
    },
  ) {
    this.assertNMIfAssociation(dto.associationClassId, dto.sourceMult, dto.targetMult)
    const ids = [dto.sourceClassId, dto.targetClassId].concat(dto.associationClassId ? [dto.associationClassId] : [])
    await this.ensureSameDiagram(diagramId, ...ids)

    const created = await this.prisma.umlRelation.create({
      data: {
        uuid: randomUUID(),
        kind: dto.kind,
        sourceMult: dto.sourceMult,
        targetMult: dto.targetMult,
        sourceRole: dto.sourceRole ?? null,
        targetRole: dto.targetRole ?? null,
        navigableAToB: !!dto.navigableAToB,
        navigableBToA: !!dto.navigableBToA,
        diagram:      { connect: { id: diagramId } },
        sourceClass:  { connect: { id: dto.sourceClassId } },
        targetClass:  { connect: { id: dto.targetClassId } },
        ...(dto.associationClassId != null
          ? { associationClass: { connect: { id: dto.associationClassId } } }
          : {}),
      },
      select: {
        id: true, kind: true,
        sourceClassId: true, targetClassId: true,
        sourceMult: true, targetMult: true,
        sourceRole: true, targetRole: true,
        navigableAToB: true, navigableBToA: true,
        diagramId: true,
      },
    })
    return created
  }

  async update(
    id: number,
    dto: {
      kind?: RelationType
      sourceClassId?: number | null; targetClassId?: number | null
      sourceMult?: string; targetMult?: string
      sourceRole?: string | null; targetRole?: string | null
      navigableAToB?: boolean; navigableBToA?: boolean
      associationClassId?: number | null
    },
  ) {
    const current = await this.ensureRelation(id)

    const sourceMult = dto.sourceMult ?? current.sourceMult
    const targetMult = dto.targetMult ?? current.targetMult
    if (dto.associationClassId !== undefined) {
      this.assertNMIfAssociation(dto.associationClassId, sourceMult, targetMult)
    }

    const diagramId = current.diagramId
    const srcId = dto.sourceClassId ?? current.sourceClassId
    const tgtId = dto.targetClassId ?? current.targetClassId
    const ids = [srcId, tgtId]
      .concat(dto.associationClassId != null ? [dto.associationClassId] : [])
      .filter((x): x is number => typeof x === 'number')
    await this.ensureSameDiagram(diagramId, ...ids)

    const data: any = {
      kind: dto.kind ?? undefined,
      sourceMult: dto.sourceMult ?? undefined,
      targetMult: dto.targetMult ?? undefined,
      sourceRole: dto.sourceRole === undefined ? undefined : (dto.sourceRole ?? null),
      targetRole: dto.targetRole === undefined ? undefined : (dto.targetRole ?? null),
      navigableAToB: dto.navigableAToB ?? undefined,
      navigableBToA: dto.navigableBToA ?? undefined,
      ...(dto.sourceClassId != null ? { sourceClass: { connect: { id: dto.sourceClassId } } } : {}),
      ...(dto.targetClassId != null ? { targetClass: { connect: { id: dto.targetClassId } } } : {}),
    }
    if (dto.associationClassId === null) {
      data.associationClass = { disconnect: true }
    } else if (dto.associationClassId !== undefined) {
      data.associationClass = { connect: { id: dto.associationClassId } }
    }

    const updated = await this.prisma.umlRelation.update({
      where: { id },
      data,
      select: {
        id: true, kind: true,
        sourceClassId: true, targetClassId: true,
        sourceMult: true, targetMult: true,
        sourceRole: true, targetRole: true,
        navigableAToB: true, navigableBToA: true,
        diagramId: true,
      },
    })
    return updated
  }

  async remove(id: number) {
    await this.ensureRelation(id)
    return this.prisma.umlRelation.delete({ where: { id } })
  }
}
