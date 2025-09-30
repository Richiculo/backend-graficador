import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtGuard } from '../auth/jwt.guard';

@UseGuards(JwtGuard)
@Controller('diagrams/:id/export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  // ---------- SPRING ZIP ----------
  @Get('spring')
  @Header('Content-Type', 'application/zip')
  async springGet(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportSpring(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('spring')
  @Header('Content-Type', 'application/zip')
  async springPost(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportSpring(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ---------- DDL ----------
  @Get('ddl')
  @Header('Content-Type', 'application/sql')
  async ddlGet(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportDDL(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('ddl')
  @Header('Content-Type', 'application/sql')
  async ddlPost(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportDDL(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ---------- POSTMAN ----------
  @Get('postman')
  @Header('Content-Type', 'application/json')
  async postmanGet(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportPostman(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('postman')
  @Header('Content-Type', 'application/json')
  async postmanPost(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, buffer } = await this.service.exportPostman(Number(id));
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
