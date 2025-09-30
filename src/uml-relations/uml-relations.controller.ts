import { Controller, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common'
import { UmlRelationsService } from './uml-relations.service'
import { RelationType } from '@prisma/client'
import { CreateUmlRelationDto } from './dto/create-uml-relation.dto'
import { UpdateUmlRelationDto } from './dto/update-uml-relation.dto'
import { DiagramEventsService } from '../collab/diagram-events.service'

@Controller('diagrams/:diagramId/relations')
export class UmlRelationsController {
  constructor(
    private readonly service: UmlRelationsService,
    private readonly events: DiagramEventsService,
  ) {}

  @Post()
  async create(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Body() body: CreateUmlRelationDto & { associationClassId?: number | null },
  ) {
    const edge = await this.service.create(diagramId, body)
    this.events.emit(diagramId, { type: 'relation.created', edge })
    return edge
  }

  @Patch(':id')
  async update(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUmlRelationDto & { associationClassId?: number | null },
  ) {
    const edge = await this.service.update(id, body)
    this.events.emit(diagramId, { type: 'relation.updated', edge })
    return edge
  }

  @Delete(':id')
  async delete(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(id)
    this.events.emit(diagramId, { type: 'relation.deleted', id })
    return { ok: true }
  }
}
