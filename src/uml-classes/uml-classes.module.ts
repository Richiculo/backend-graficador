import { Module } from '@nestjs/common';
import { UmlClassesService } from './uml-classes.service';
import { UmlClassesController } from './uml-classes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CollabModule } from '../collab/collab.module';

@Module({
  imports: [PrismaModule, CollabModule],
  controllers: [UmlClassesController],
  providers: [UmlClassesService],
  exports: [UmlClassesService],
})
export class UmlClassesModule {}
