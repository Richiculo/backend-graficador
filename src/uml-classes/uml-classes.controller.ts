import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { UmlClassesService } from './uml-classes.service';
import { CreateAttributeDto } from './dto/create-atribute.dto';
import { CreateClassDto } from './dto/create-uml-class.dto';
import { CreateMethodDto } from './dto/create-method.dto';
import { DiagramEventsService } from '../collab/diagram-events.service';
import { CollabService } from '../collab/collab.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtGuard } from '../auth/jwt.guard';

interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
}

@Controller()
@UseGuards(JwtGuard)
export class UmlClassesController {
  constructor(
    private readonly service: UmlClassesService, 
    private readonly events: DiagramEventsService,
    private readonly collab: CollabService
  ) {}

  //--- Get ---
  //Clases por id
  @Get('classes/:id')
  getClass(@Param('id') id: string) {
    return this.service.getClass(Number(id));
  }
  //atributos por id
  @Get('classes/:id/attributes')
  getAttributes(@Param('id') id: string) {
    return this.service.getAttributes(Number(id));
  }
  //metodos por id
  @Get('classes/:id/methods')
  getMethods(@Param('id') id: string) {
    return this.service.getMethods(Number(id));
  }

  //--POST--
  //crear una clase
  @Post('diagrams/:diagramId/classes')
  async createClass(
    @Param('diagramId') diagramId: string, 
    @Body() dto: CreateClassDto,
    @CurrentUser() user: User
  ) {
    const diagramIdNum = Number(diagramId);
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramIdNum, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    // Crear la clase
    const c = await this.service.create(diagramIdNum, dto);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramIdNum);
    await this.collab.saveChange({
      diagramId: diagramIdNum,
      seq,
      type: 'class.created',
      payload: {
        class: {
          id: c.id,
          uuid: c.uuid,
          name: c.name,
          stereotype: c.stereotype,
          isAbstract: c.isAbstract,
          x: c.x,
          y: c.y,
          attributes: c.attributes || [],
          methods: c.methods || []
        }
      },
      authorId: user.id
    });

    // Emitir evento en tiempo real
    this.events.emit(diagramIdNum, { 
      type: 'class.created', 
      seq,
      payload: {
        class: {
          id: c.id,
          uuid: c.uuid,
          name: c.name,
          stereotype: c.stereotype,
          isAbstract: c.isAbstract,
          x: c.x,
          y: c.y,
          attributes: c.attributes || [],
          methods: c.methods || []
        }
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    // Snapshot periódico
    await this.collab.maybeSnapshot(diagramIdNum, seq, user.id);
    
    return c;
  }

  //añadir un atributo
  @Post('classes/:id/attributes')
  async addAttr(
    @Param('id') classId: string, 
    @Body() dto: CreateAttributeDto,
    @CurrentUser() user: User
  ) {
    const classIdNum = Number(classId);
    
    // Obtener diagramId de la clase
    const classData = await this.service.getClass(classIdNum);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const attr = await this.service.addAttribute(classIdNum, dto);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'attribute.created',
      payload: {
        classId: classIdNum,
        attribute: {
          id: attr.id,
          uuid: attr.uuid,
          name: attr.name,
          type: attr.type,
          order: attr.order,
          defaultValue: attr.defaultValue,
          isReadOnly: attr.isReadOnly,
          isStatic: attr.isStatic,
          visibility: attr.visibility
        }
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'attribute.created',
      seq,
      payload: {
        classId: classIdNum,
        attribute: {
          id: attr.id,
          uuid: attr.uuid,
          name: attr.name,
          type: attr.type,
          order: attr.order,
          defaultValue: attr.defaultValue,
          isReadOnly: attr.isReadOnly,
          isStatic: attr.isStatic,
          visibility: attr.visibility
        }
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return attr;
  }

  //añadir un metodo
  @Post('classes/:id/methods')
  async addMethod(
    @Param('id') classId: string, 
    @Body() dto: CreateMethodDto,
    @CurrentUser() user: User
  ) {
    const classIdNum = Number(classId);
    
    // Obtener diagramId de la clase
    const classData = await this.service.getClass(classIdNum);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const method = await this.service.addMethod(classIdNum, dto);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'method.created',
      payload: {
        classId: classIdNum,
        method: {
          id: method.id,
          uuid: method.uuid,
          name: method.name,
          order: method.order,
          isStatic: method.isStatic,
          isAbstract: method.isAbstract,
          returnType: method.returnType,
          visibility: method.visibility
        }
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'method.created',
      seq,
      payload: {
        classId: classIdNum,
        method: {
          id: method.id,
          uuid: method.uuid,
          name: method.name,
          order: method.order,
          isStatic: method.isStatic,
          isAbstract: method.isAbstract,
          returnType: method.returnType,
          visibility: method.visibility
        }
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return method;
  }

  //---Patch---
  //editar un clase(mover)
  @Patch('classes/:id/move')
  async move(
    @Param('id') id: string, 
    @Body() body: { x: number; y: number },
    @CurrentUser() user: User
  ) {
    const classId = Number(id);
    
    // Obtener diagramId antes de mover
    const classData = await this.service.getClass(classId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    // Mover la clase
    const res = await this.service.move(classId, body.x, body.y);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'class.moved',
      payload: {
        classId: res.id,
        uuid: res.uuid,
        x: res.x,
        y: res.y
      },
      authorId: user.id
    });

    // Emitir evento con datos completos
    this.events.emit(diagramId, { 
      type: 'class.moved', 
      seq,
      payload: {
        classId: res.id,
        uuid: res.uuid,
        x: res.x,
        y: res.y
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return { ok: true };
  }

  //editar una clase(renombrar)
  @Patch('classes/:id/rename')
  async rename(
    @Param('id') id: string, 
    @Body() body: { name: string },
    @CurrentUser() user: User
  ) {
    const classId = Number(id);
    
    // Obtener diagramId
    const classData = await this.service.getClass(classId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.rename(classId, body.name);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'class.renamed',
      payload: {
        classId: res.id,
        uuid: res.uuid,
        name: res.name
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'class.renamed',
      seq,
      payload: {
        classId: res.id,
        uuid: res.uuid,
        name: res.name
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }

  //actualizar un clase
  @Patch('classes/:id')
  async updateClass(
    @Param('id') id: string, 
    @Body() body: {
      name?: string; stereotype?: string; isAbstract?: boolean; x?: number; y?: number;
    },
    @CurrentUser() user: User
  ) {
    const classId = Number(id);
    
    // Obtener diagramId
    const classData = await this.service.getClass(classId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.updateClass(classId, body);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'class.updated',
      payload: {
        classId: res.id,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'class.updated',
      seq,
      payload: {
        classId: res.id,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }

  //actualizar un atributo
  @Patch('attributes/:id')
  async updateAttr(
    @Param('id') id: string, 
    @Body() body: {
      name?: string; type?: string; order?: number; defaultValue?: string | null;
      isStatic?: boolean; isReadOnly?: boolean; visibility?: string;
    },
    @CurrentUser() user: User
  ) {
    const attrId = Number(id);
    const res = await this.service.updateAttribute(attrId, body);
    
    // Obtener diagramId a través de la clase
    const classData = await this.service.getClass(res.umlClassId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'attribute.updated',
      payload: {
        attributeId: res.id,
        classId: res.umlClassId,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'attribute.updated',
      seq,
      payload: {
        attributeId: res.id,
        classId: res.umlClassId,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }

  //actualizar un metodo
  @Patch('methods/:id')
  async updateMethod(
    @Param('id') id: string, 
    @Body() body: {
      name?: string; returnType?: string; order?: number;
      isStatic?: boolean; isAbstract?: boolean; visibility?: string;
    },
    @CurrentUser() user: User
  ) {
    const methodId = Number(id);
    const res = await this.service.updateMethod(methodId, body);
    
    // Obtener diagramId a través de la clase
    const classData = await this.service.getClass(res.umlClassId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'method.updated',
      payload: {
        methodId: res.id,
        classId: res.umlClassId,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'method.updated',
      seq,
      payload: {
        methodId: res.id,
        classId: res.umlClassId,
        uuid: res.uuid,
        changes: body
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }

  //reordenar atributos
  @Patch('classes/:id/attributes/reorder')
  async reorderAttrs(
    @Param('id') classId: string, 
    @Body() body: { from: number; to: number },
    @CurrentUser() user: User
  ) {
    const cid = Number(classId);
    const { from, to } = body;
    
    // Obtener diagramId
    const classData = await this.service.getClass(cid);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.reorderAttributes(cid, from, to);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'attributes.reordered',
      payload: {
        classId: cid,
        from,
        to
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'attributes.reordered',
      seq,
      payload: {
        classId: cid,
        from,
        to
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }

  //---Delete---
  //borrar un clase
  @Delete('classes/:id')
  async deleteClass(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    const classId = Number(id);
    
    // Obtener diagramId antes de eliminar
    const classData = await this.service.getClass(classId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.removeClass(classId);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'class.deleted',
      payload: {
        classId: res.id,
        uuid: res.uuid
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, { 
      type: 'class.deleted', 
      seq,
      payload: {
        classId: res.id,
        uuid: res.uuid
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return { ok: true };
  }
  
  //eliminar un atributo
  @Delete('attributes/:id')
  async deleteAttr(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    const attrId = Number(id);
    
    // Primero obtenemos la info del atributo antes de eliminarlo
    const attr = await this.service.getAttributeById(attrId);
    if (!attr) {
      throw new Error('Atributo no encontrado');
    }
    const classData = await this.service.getClass(attr.umlClassId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.removeAttribute(attrId);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'attribute.deleted',
      payload: {
        attributeId: attrId,
        classId: attr.umlClassId,
        uuid: attr.uuid
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'attribute.deleted',
      seq,
      payload: {
        attributeId: attrId,
        classId: attr.umlClassId,
        uuid: attr.uuid
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }
  
  //eliminar un metodo
  @Delete('methods/:id')
  async deleteMethod(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    const methodId = Number(id);
    
    // Primero obtenemos la info del método antes de eliminarlo
    const method = await this.service.getMethodById(methodId);
    if (!method) {
      throw new Error('Método no encontrado');
    }
    const classData = await this.service.getClass(method.umlClassId);
    if (!classData) {
      throw new Error('Clase no encontrada');
    }
    const diagramId = classData.diagramId;
    
    // Verificar permisos
    const canEdit = await this.collab.canEdit(diagramId, user.id);
    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este diagrama');
    }

    const res = await this.service.removeMethod(methodId);
    
    // Generar secuencia y guardar cambio
    const seq = await this.collab.nextSeq(diagramId);
    await this.collab.saveChange({
      diagramId,
      seq,
      type: 'method.deleted',
      payload: {
        methodId: methodId,
        classId: method.umlClassId,
        uuid: method.uuid
      },
      authorId: user.id
    });

    // Emitir evento
    this.events.emit(diagramId, {
      type: 'method.deleted',
      seq,
      payload: {
        methodId: methodId,
        classId: method.umlClassId,
        uuid: method.uuid
      },
      authorId: user.id,
      timestamp: new Date().toISOString()
    });

    await this.collab.maybeSnapshot(diagramId, seq, user.id);
    return res;
  }
}
