import { Injectable } from '@nestjs/common';
import { CreateUmlRelationDto } from './dto/create-uml-relation.dto';
import { UpdateUmlRelationDto } from './dto/update-uml-relation.dto';
import { RelationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UmlRelationsService {
  constructor(private prisma: PrismaService) {}

  create(diagramId: number, dto: {
    kind: RelationType;
    sourceClassId: number; targetClassId: number;
    sourceMult: string; targetMult: string;
    sourceRole?: string; targetRole?: string;
    navigableAToB?: boolean; navigableBToA?: boolean;
  }) {
    // Nota: en tu modelo guardas solo diagramId, no los classId.
    // Para tener trazabilidad, conserva classIds en nombres de rol o agrega columnas si lo ves necesario.
    return this.prisma.umlRelation.create({
      data: {
        uuid: crypto.randomUUID(),
        kind: dto.kind,
        sourceMult: dto.sourceMult,
        targetMult: dto.targetMult,
        sourceRole: dto.sourceRole,
        targetRole: dto.targetRole,
        navigableAToB: !!dto.navigableAToB,
        navigableBToA: !!dto.navigableBToA,
        diagram: { connect: { id: diagramId } },
      },
    });
  }
}
