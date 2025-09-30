import { Injectable, NotFoundException } from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';


@Injectable()
export class DiagramsService {
  constructor(private prisma: PrismaService){}

  async create(dto: { name: string; description?: string; projectId: number }) {
    // 1) buscamos el proyecto para saber el userId del dueño
    const project = await this.prisma.proyect.findUnique({
      where: { id: dto.projectId },
      select: { userId: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    // 2) creamos el diagrama
    const diagram = await this.prisma.diagram.create({
      data: {
        name: dto.name,
        description: dto.description,
        uuid: randomUUID(),
        project: { connect: { id: dto.projectId } },
      },
    });

    // 3) registramos al dueño del proyecto como OWNER del diagrama
    await this.prisma.diagramMember.create({
      data: {
        diagramId: diagram.id,
        userId: project.userId,
        role: 'OWNER',
      },
    });

    return diagram;
  }

  list(projectId: number) {
    return this.prisma.diagram.findMany({
      where: { projectId }, orderBy: { createdAt: 'desc' },
      include: { classes: true, relations: true },
    });
  }

  async byId(id: number) {
    const d = await this.prisma.diagram.findUnique({ where: { id }});
    if (!d) throw new NotFoundException('Diagram not found');
    return d;
  }

  update(id: number, data: { name?: string; description?: string }) {
    return this.prisma.diagram.update({ where: { id }, data });
  }

  remove(id: number) { return this.prisma.diagram.delete({ where: { id } }); }

  async getClass(id: number) {
    const cls = await this.prisma.umlClass.findUnique({
      where: { id },
      include: {
        attributes: { orderBy: { order: 'asc' } },
        methods:    { orderBy: { order: 'asc' } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async getAttributes(classId: number) {
    await this.ensureClass(classId);
    return this.prisma.umlAttribute.findMany({
      where: { umlClassId: classId },
      orderBy: { order: 'asc' },
    });
  }

  async getMethods(classId: number) {
    await this.ensureClass(classId);
    return this.prisma.umlMethod.findMany({
      where: { umlClassId: classId },
      orderBy: { order: 'asc' },
    });
  }

  private async ensureClass(id: number) {
    const c = await this.prisma.umlClass.findUnique({ where: { id }});
    if (!c) throw new NotFoundException('Class not found');
  }

  async listClasses(diagramId: number) {
    await this.ensureDiagram(diagramId);
    return this.prisma.umlClass.findMany({
      where: { diagramId },
      orderBy: { id: 'asc' },
      select: { id: true, uuid: true, name: true, stereotype: true, isAbstract: true, x: true, y: true },
    });
  }

  async listClassesFull(diagramId: number) {
    await this.ensureDiagram(diagramId);
    return this.prisma.umlClass.findMany({
      where: { diagramId },
      orderBy: { id: 'asc' },
      include: {
        attributes: { orderBy: { order: 'asc' } },
        methods:    { orderBy: { order: 'asc' } },
      },
    });
  }

  async listRelations(diagramId: number) {
    await this.ensureDiagram(diagramId);
    return this.prisma.umlRelation.findMany({
      where: { diagramId },
      orderBy: { id: 'asc' },
      include: {
        // si agregaste sourceClassId / targetClassId
        sourceClass: { select: { id: true, name: true } },
        targetClass: { select: { id: true, name: true } },
      },
    });
  }

  private async ensureDiagram(id: number) {
    const d = await this.prisma.diagram.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Diagram not found');
  }

}

