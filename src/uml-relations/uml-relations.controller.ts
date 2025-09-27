import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UmlRelationsService } from './uml-relations.service';
import { CreateUmlRelationDto } from './dto/create-uml-relation.dto';
import { UpdateUmlRelationDto } from './dto/update-uml-relation.dto';
import { RelationType } from '@prisma/client'

@Controller('diagrams/:diagramId/relations')
export class UmlRelationsController {
  constructor(private readonly service: UmlRelationsService) {}

  @Post()
  create(@Param('diagramId') diagramId: string, @Body() body: {
    kind: RelationType; sourceClassId: number; targetClassId: number;
    sourceMult: string; targetMult: string; sourceRole?: string; targetRole?: string;
    navigableAToB?: boolean; navigableBToA?: boolean;
  }) {
    return this.service.create(Number(diagramId), body);
  }
}
