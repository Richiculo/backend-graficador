import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';


@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  //---Get---
  //por proyecto
  @Get()
    list(@Query('projectId') projectId: string) { return this.diagramsService.list(Number(projectId)); }

   // LIST SIMPLE (clases sin atributos/métodos)
  @Get(':id/classes')
  classes(@Param('id') id: string) {
    return this.diagramsService.listClasses(Number(id));
  }

  // LIST FULL (clases + atributos + métodos)
  @Get(':id/classes/full')
  classesFull(@Param('id') id: string) {
    return this.diagramsService.listClassesFull(Number(id));
  }

  // RELATIONS del diagrama
  @Get(':id/relations')
  relations(@Param('id') id: string) {
    return this.diagramsService.listRelations(Number(id));
  }

  @Get(':id')
    get(@Param('id') id: string) { return this.diagramsService.byId(Number(id)); }
  
  //---Post---
  //crear diagrama
  @Post()
  create(@Body() dto: CreateDiagramDto) {
    return this.diagramsService.create(dto);
  }

  //Editar diagrama
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.diagramsService.update(Number(id), body);
  }

  //Eliminar diagrama
  @Delete(':id')
  delete(@Param('id') id: string) { return this.diagramsService.remove(Number(id)); }


}
