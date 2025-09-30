import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-uml-class.dto';
import { CreateAttributeDto } from './dto/create-atribute.dto';
import { CreateMethodDto } from './dto/create-method.dto';
import { AccessModifier } from '@prisma/client';

@Injectable()
export class UmlClassesService {
  constructor(private prisma: PrismaService) {}

  async create(diagramId: number, dto: CreateClassDto) {
    return this.prisma.umlClass.create({
      data: {
        diagramId,
        name: dto.name,
        stereotype: dto.stereotype,
        isAbstract: dto.isAbstract ?? false,
        x: dto.x,
        y: dto.y,
      },
      include: {
        attributes: { orderBy: { order: 'asc' } },
        methods: { orderBy: { order: 'asc' } },
      },
    });
  }

  async move(classId: number, x: number, y: number) {
    return this.prisma.umlClass.update({
      where: { id: classId },
      data: { x, y },
    });
  }

  async rename(classId: number, name: string) {
    return this.prisma.umlClass.update({
      where: { id: classId },
      data: { name },
    });
  }

  async updateClass(classId: number, data: {
    name?: string;
    stereotype?: string;
    isAbstract?: boolean;
    x?: number;
    y?: number;
  }) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.stereotype !== undefined) updateData.stereotype = data.stereotype;
    if (data.isAbstract !== undefined) updateData.isAbstract = data.isAbstract;
    if (data.x !== undefined) updateData.x = data.x;
    if (data.y !== undefined) updateData.y = data.y;

    return this.prisma.umlClass.update({
      where: { id: classId },
      data: updateData,
    });
  }

  async getClass(id: number) {
    return this.prisma.umlClass.findUnique({
      where: { id },
      include: {
        attributes: { orderBy: { order: 'asc' } },
        methods: { orderBy: { order: 'asc' } },
      },
    });
  }

  async getAttributes(classId: number) {
    return this.prisma.umlAttribute.findMany({
      where: { umlClassId: classId },
      orderBy: { order: 'asc' },
    });
  }

  async getMethods(classId: number) {
    return this.prisma.umlMethod.findMany({
      where: { umlClassId: classId },
      orderBy: { order: 'asc' },
    });
  }

  async addAttribute(classId: number, dto: CreateAttributeDto) {
    // Obtener el siguiente orden
    const maxOrder = await this.prisma.umlAttribute.findFirst({
      where: { umlClassId: classId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return this.prisma.umlAttribute.create({
      data: {
        umlClassId: classId,
        name: dto.name,
        type: dto.type,
        order: (maxOrder?.order ?? 0) + 1,
        defaultValue: dto.defaultValue,
        isReadOnly: dto.isReadOnly ?? false,
        isStatic: dto.isStatic ?? false,
        visibility: dto.visibility as AccessModifier,
      },
    });
  }

  async addMethod(classId: number, dto: CreateMethodDto) {
    // Obtener el siguiente orden
    const maxOrder = await this.prisma.umlMethod.findFirst({
      where: { umlClassId: classId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return this.prisma.umlMethod.create({
      data: {
        umlClassId: classId,
        name: dto.name,
        order: (maxOrder?.order ?? 0) + 1,
        isStatic: dto.isStatic ?? false,
        isAbstract: dto.isAbstract ?? false,
        returnType: dto.returnType,
        visibility: dto.visibility as AccessModifier,
      },
    });
  }

  async updateAttribute(attributeId: number, data: {
    name?: string;
    type?: string;
    order?: number;
    defaultValue?: string | null;
    isStatic?: boolean;
    isReadOnly?: boolean;
    visibility?: string;
  }) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
    if (data.isStatic !== undefined) updateData.isStatic = data.isStatic;
    if (data.isReadOnly !== undefined) updateData.isReadOnly = data.isReadOnly;
    if (data.visibility !== undefined) updateData.visibility = data.visibility as AccessModifier;

    return this.prisma.umlAttribute.update({
      where: { id: attributeId },
      data: updateData,
    });
  }

  async updateMethod(methodId: number, data: {
    name?: string;
    returnType?: string;
    order?: number;
    isStatic?: boolean;
    isAbstract?: boolean;
    visibility?: string;
  }) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.returnType !== undefined) updateData.returnType = data.returnType;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.isStatic !== undefined) updateData.isStatic = data.isStatic;
    if (data.isAbstract !== undefined) updateData.isAbstract = data.isAbstract;
    if (data.visibility !== undefined) updateData.visibility = data.visibility as AccessModifier;

    return this.prisma.umlMethod.update({
      where: { id: methodId },
      data: updateData,
    });
  }

  async reorderAttributes(classId: number, from: number, to: number) {
    // Implementación básica de reordenamiento
    const attributes = await this.prisma.umlAttribute.findMany({
      where: { umlClassId: classId },
      orderBy: { order: 'asc' },
    });

    // Reordenar en memoria
    const attr = attributes.find(a => a.order === from);
    if (!attr) throw new Error('Attribute not found');

    // Actualizar órdenes usando transacciones para consistencia
    return this.prisma.$transaction(async (tx) => {
      if (from < to) {
        // Mover hacia abajo
        await tx.umlAttribute.updateMany({
          where: {
            umlClassId: classId,
            order: { gte: from + 1, lte: to },
          },
          data: { order: { decrement: 1 } },
        });
      } else {
        // Mover hacia arriba
        await tx.umlAttribute.updateMany({
          where: {
            umlClassId: classId,
            order: { gte: to, lte: from - 1 },
          },
          data: { order: { increment: 1 } },
        });
      }

      // Actualizar el atributo movido
      await tx.umlAttribute.update({
        where: { id: attr.id },
        data: { order: to },
      });

      return { success: true };
    });
  }

  async removeClass(classId: number) {
    return this.prisma.umlClass.delete({
      where: { id: classId },
    });
  }

  async removeAttribute(attributeId: number) {
    return this.prisma.umlAttribute.delete({
      where: { id: attributeId },
    });
  }

  async removeMethod(methodId: number) {
    return this.prisma.umlMethod.delete({
      where: { id: methodId },
    });
  }

  // Métodos faltantes que necesita el controlador
  async getAttributeById(attributeId: number) {
    return this.prisma.umlAttribute.findUnique({
      where: { id: attributeId },
    });
  }

  async getMethodById(methodId: number) {
    return this.prisma.umlMethod.findUnique({
      where: { id: methodId },
    });
  }
}
