import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ValidationService } from './validation.service';


@Controller('diagrams/:id/validate')
export class ValidationController {
  constructor(private readonly service: ValidationService) {}

  @Post()
  run(@Param('id') id: string) { return this.service.validateDiagram(Number(id)); }
}
