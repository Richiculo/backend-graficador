import { Injectable, NotFoundException } from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';


@Injectable()
export class DiagramsService {
  constructor(private prisma: PrismaService){}

  create(dto: { name: string; description?: string; projectId: number }) {
    return this.prisma.diagram.create({
      data: {
        name: dto.name,
        description: dto.description,
        uuid: crypto.randomUUID(),
        project: { connect: { id: dto.projectId } },
      },
    });
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

}

