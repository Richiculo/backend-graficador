import { Module } from '@nestjs/common';
import { UmlRelationsService } from './uml-relations.service';
import { UmlRelationsController } from './uml-relations.controller';

@Module({
  controllers: [UmlRelationsController],
  providers: [UmlRelationsService],
})
export class UmlRelationsModule {}
