import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { DiagramsModule } from './diagrams/diagrams.module';
import { UmlClassesModule } from './uml-classes/uml-classes.module';
import { UmlRelationsModule } from './uml-relations/uml-relations.module';
import { ValidationModule } from './validation/validation.module';
import { AuthModule } from './auth/auth.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [PrismaModule, ProjectsModule, DiagramsModule, UmlClassesModule, UmlRelationsModule, ValidationModule, AuthModule, ExportModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
