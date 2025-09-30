import { Controller, Get, Post, Param } from '@nestjs/common';
import { ValidationService } from './validation.service';

@Controller('diagrams/:id/validate')
export class ValidationController {
  constructor(private readonly service: ValidationService) {}

  @Post()
  runPost(@Param('id') id: string) {
    return this.service.validateDiagram(Number(id));
  }

  @Get()
  runGet(@Param('id') id: string) {
    return this.service.validateDiagram(Number(id));
  }
}
