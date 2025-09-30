import { Module } from '@nestjs/common';
import { CollabService } from './collab.service';
import { CollabGateway } from './colab.gateway';
import { CollabController } from './colab.controller';
import { InvitationsService } from './invitation.service';
import { InvitationsController } from './invitation.controller';
import { PresenceService } from './presence.service';
import { DiagramEventsService } from './diagram-events.service';

@Module({
  providers: [CollabGateway, CollabService, InvitationsService, PresenceService, DiagramEventsService],
  controllers: [CollabController, InvitationsController],
  exports: [CollabService, PresenceService, DiagramEventsService],
})
export class CollabModule {}
