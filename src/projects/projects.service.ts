import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(private prisma:PrismaService){}

  async create(userId:number, dto: CreateProjectDto) {
    const data: Prisma.ProyectCreateInput = {
      name: dto.name,
      description: dto.description,
      uuid: randomUUID(),
      user: { connect: { id: userId } },
    };
    return this.prisma.proyect.create({ data });
  }

  findAllByUser(userId: number){
    return this.prisma .proyect.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc'},
      include: {diagrams: true},
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.proyect.findUnique({
      where: {id}
    });
    if(!p) throw new Error("Project not found");
    return p;
  }

  async update(id: number, data: Prisma.ProyectUpdateInput) {
    await this.findOne(id);
    return this.prisma.proyect.update({
      where: {id},
      data
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.proyect.delete({
      where:  {id}
    });
  }
}
