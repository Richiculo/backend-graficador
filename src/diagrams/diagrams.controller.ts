import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';


@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post()
  create(@Body() dto: CreateDiagramDto) {
    return this.diagramsService.create(dto);
  }

  @Get()
  list(@Query('projectId') projectId: string) { return this.diagramsService.list(Number(projectId)); }

  @Get(':id')
  get(@Param('id') id: string) { return this.diagramsService.byId(Number(id)); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.diagramsService.update(Number(id), body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.diagramsService.remove(Number(id)); }
}
