import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UmlClassesService } from './uml-classes.service';
import { CreateAttributeDto } from './dto/create-atribute.dto';
import { CreateClassDto } from './dto/create-uml-class.dto';

@Controller()
export class UmlClassesController {
  constructor(private readonly service: UmlClassesService) {}

  @Post('diagrams/:diagramId/classes')
  createClass(@Param('diagramId') diagramId: string, @Body() dto: CreateClassDto) {
    return this.service.create(Number(diagramId), dto);
  }

  @Patch('classes/:id/move')
  move(@Param('id') id: string, @Body() body: { x: number; y: number }) {
    return this.service.move(Number(id), body.x, body.y);
  }

  @Patch('classes/:id/rename')
  rename(@Param('id') id: string, @Body() body: { name: string }) {
    return this.service.rename(Number(id), body.name);
  }

  @Post('classes/:id/attributes')
  addAttr(@Param('id') classId: string, @Body() dto: CreateAttributeDto) {
    return this.service.addAttribute(Number(classId), dto);
  }

  @Post('classes/:id/methods')
  addMethod(@Param('id') classId: string, @Body() dto: {
    name: string; order: number; returnType: string; visibility: string; isStatic?: boolean; isAbstract?: boolean;
  }) {
    return this.service.addMethod(Number(classId), dto as any);
  }
}
