import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, StreamableFile, Header } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtGuard } from '../auth/jwt.guard';
import type { Response } from 'express';


@UseGuards(JwtGuard)
@Controller('diagrams/:id/export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Post('spring')
  @Header('Content-Type', 'application/zip')
  async spring(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportSpring(Number(id));
    return new StreamableFile(buffer, { disposition: `attachment; filename="${filename}"` });
  }

  @Post('ddl')
  @Header('Content-Type', 'application/sql')
  async ddl(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportDDL(Number(id));
    return new StreamableFile(buffer, { disposition: `attachment; filename="${filename}"` });
  }

  @Post('postman')
  @Header('Content-Type', 'application/json')
  async postman(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportPostman(Number(id));
    return new StreamableFile(buffer, { disposition: `attachment; filename="${filename}"` });
  }
}
