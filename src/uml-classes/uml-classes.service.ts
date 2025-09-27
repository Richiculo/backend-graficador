import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessModifier } from '@prisma/client';

@Injectable()
export class UmlClassesService {
  constructor(private prisma: PrismaService) {}

  async create(diagramId: number, dto: { name: string; stereotype?: string; isAbstract?: boolean; x: number; y: number; }) {
    // asegura que el diagrama exista
    await this.ensureDiagram(diagramId);
    return this.prisma.umlClass.create({
      data: { ...dto, uuid: crypto.randomUUID(), diagram: { connect: { id: diagramId } } },
    });
  }

  move(id: number, x: number, y: number) {
    return this.prisma.umlClass.update({ where: { id }, data: { x, y } });
  }

  rename(id: number, name: string) {
    return this.prisma.umlClass.update({ where: { id }, data: { name } });
  }

  addAttribute(classId: number, dto: {
    name: string; type: string; order: number; defaultValue?: string;
    visibility: AccessModifier; isStatic?: boolean; isReadOnly?: boolean;
  }) {
    return this.prisma.umlAttribute.create({
      data: { ...dto, uuid: crypto.randomUUID(), umlClass: { connect: { id: classId } } },
    });
  }

  addMethod(classId: number, dto: {
    name: string; order: number; returnType: string;
    isStatic?: boolean; isAbstract?: boolean; visibility: AccessModifier;
  }) {
    return this.prisma.umlMethod.create({
      data: { ...dto, uuid: crypto.randomUUID(), umlClass: { connect: { id: classId } } },
    });
  }

  private async ensureDiagram(id: number) {
    const d = await this.prisma.diagram.findUnique({ where: { id }});
    if (!d) throw new NotFoundException('Diagram not found');
  }
}
