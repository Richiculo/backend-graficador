import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeController } from './realtime.controller';
import { DiagramEventsService } from './diagram-events.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'devsecret' })],
  controllers: [RealtimeController],
  providers: [DiagramEventsService],
  exports: [DiagramEventsService],
})
export class RealtimeModule {}
