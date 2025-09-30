import { Module } from '@nestjs/common';
import { UmlRelationsService } from './uml-relations.service';
import { UmlRelationsController } from './uml-relations.controller';
import { DiagramEventsService } from '../collab/diagram-events.service';

@Module({
  controllers: [UmlRelationsController],
  providers: [UmlRelationsService, DiagramEventsService],
  exports: [UmlRelationsService, DiagramEventsService]
})
export class UmlRelationsModule {}
