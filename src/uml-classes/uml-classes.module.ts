import { Module } from '@nestjs/common';
import { UmlClassesService } from './uml-classes.service';
import { UmlClassesController } from './uml-classes.controller';

@Module({
  controllers: [UmlClassesController],
  providers: [UmlClassesService],
})
export class UmlClassesModule {}
