import { Controller, Sse, Param, Query, Post, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { DiagramEventsService } from './diagram-events.service';
import type { MessageEvent } from '@nestjs/common';

@Controller('diagrams/:diagramId')
export class RealtimeController {
  constructor(
    private readonly events: DiagramEventsService,
    private readonly jwt: JwtService,
  ) {}

  // Conexión SSE. Acepta ?access_token=... (útil desde navegador sin header)
  @Sse('events')
  sse(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Query('access_token') token?: string,
  ): Observable<MessageEvent> {
    const user = this.decodeUser(token);
    const stream = this.events.createStream(diagramId);

    // registrar presencia y difundir
    if (user) this.events.upsertPresence(diagramId, user);

    // barrido periódico (expira fantasmas)
    const timer = setInterval(() => this.events.sweepPresence(diagramId), 15000);

    return new Observable<MessageEvent>((subscriber) => {
      const sub = stream.subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        clearInterval(timer);
        this.events.removeStream(diagramId, stream);
        if (user) this.events.removePresence(diagramId, user.id);
      };
    });
  }

  // heartbeat para mantener presencia
  @Post('presence/heartbeat')
  @UseGuards() // si ya tienes JwtGuard, ponlo aquí; si no, usamos access_token por query
  heartbeat(
    @Param('diagramId', ParseIntPipe) diagramId: number,
    @Req() req: any,
    @Query('access_token') token?: string,
  ) {
    const user = req.user ?? this.decodeUser(token);
    if (user) this.events.upsertPresence(diagramId, user);
    return { ok: true };
  }

  private decodeUser(raw?: string) {
    if (!raw) return null;
    try {
      const payload = this.jwt.decode(raw) as any;
      if (!payload?.sub) return null;
      return { id: Number(payload.sub), email: payload.email ?? '', name: payload.username ?? undefined };
    } catch {
      return null;
    }
  }
}
