import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { WsJwtGuard } from '../auth/ws-jwt-guard';
import { CollabService } from './collab.service';
import type { JoinPayload, PresencePayload, UserInfo } from './types';
import { NodeCreateDto, NodeUpdateDto, NodeMoveDto, NodeDeleteDto, EdgeCreateDto, EdgeDeleteDto,EdgeUpdateDto } from './dto/dtos';

const PRESENCE_MIN_INTERVAL_MS = 50;
@WebSocketGateway({
  path: env.WS_PATH,
  transports: ['websocket'],
})
export class CollabGateway implements OnGatewayDisconnect {
  @WebSocketServer() io!: Server;
  private readonly lastPresence = new Map<string, number>();
  constructor(private readonly collab: CollabService) {}

  // 🚀 Autenticación en handshake: extrae y valida el JWT y lo coloca en socket.data.user
  afterInit(server: Server) {
    server.use((socket, next) => {
      const header = socket.handshake.headers['authorization'];
      const fromAuth = socket.handshake.auth?.token as string | undefined;
      const fromQuery = socket.handshake.query?.token as string | undefined;
    

      let token: string | undefined;
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        token = header.slice(7);
      } else if (typeof fromAuth === 'string') {
        token = fromAuth.startsWith('Bearer ') ? fromAuth.slice(7) : fromAuth;
      } else if (typeof fromQuery === 'string') {
        token = fromQuery.startsWith('Bearer ') ? fromQuery.slice(7) : fromQuery;
      }

      if (!token) return next(new Error('Unauthorized: missing token'));
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as any;
        socket.data.user = { id: payload.sub, uuid: payload.uuid, email: payload.email } satisfies UserInfo;
        return next();
      } catch {
        return next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  // Al desconectar, limpia presencia y notifica
  async handleDisconnect(client: Socket) {
    const user: UserInfo | undefined = client.data?.user;
    const diagramId: number | undefined = client.data?.diagramId;
    if (user && diagramId) {
      await this.collab.removePresence(diagramId, user.id);
      client.to(this.collab.room(diagramId)).emit('collab:member:left', { userId: user.id });
      // console.log('[collab:disconnect]', user.id, 'from diagram', diagramId);
    }
  }

  // JOIN: une al room, setea presencia inicial y devuelve miembros actuales
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('collab:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    console.log('[collab:join]', { user: client.data?.user, body });
    const user: UserInfo | undefined = client.data?.user;
    if (!user) throw new UnauthorizedException();

    const diagramId = Number(body?.diagramId);
    if (!Number.isFinite(diagramId)) throw new Error('Invalid diagramId');

    const room = this.collab.room(diagramId);

    client.data.diagramId = diagramId;
    await client.join(room);

    // presencia inicial vacía
    await this.collab.setPresence(diagramId, user.id, { cursor: null, selections: [] });

    // lista de miembros/presencia
    const members = await this.collab.listPresence(diagramId);
     const since = Number.isFinite(body.sinceSeq as number) ? Number(body.sinceSeq) : 0;
    const changes = since > 0 ? await this.collab.getChangesSince(diagramId, since) : [];
    // notificar a otros en el room
    client.to(room).emit('collab:member:joined', { user });

    // console.log('[collab:join]', user.id, '-> diagram', diagramId);
    return { ok: true, diagramId, members, changes };
  }

  // LEAVE: sale del room y limpia presencia
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('collab:leave')
  async onLeave(@ConnectedSocket() client: Socket) {
    const user: UserInfo | undefined = client.data?.user;
    const diagramId: number | undefined = client.data?.diagramId;
    if (!user || !diagramId) return { ok: true };

    await this.collab.removePresence(diagramId, user.id);
    await client.leave(this.collab.room(diagramId));
    client.to(this.collab.room(diagramId)).emit('collab:member:left', { userId: user.id });

    delete client.data.diagramId;
    // console.log('[collab:leave]', user.id, 'from diagram', diagramId);
    return { ok: true };
  }

  // PRESENCE: actualiza en store y broadcast a resto
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('collab:presence:update')
  async onPresence(@ConnectedSocket() client: Socket, @MessageBody() payload: PresencePayload) {
    const user: UserInfo | undefined = client.data?.user;
    const diagramId: number | undefined = client.data?.diagramId;
    if (!user || !diagramId) throw new UnauthorizedException();
    const key = `${diagramId}:${user.id}`;
    const now = Date.now();
    if ((this.lastPresence.get(key) ?? 0) > now - 50) { // 20 msg/seg
      return { ok: true, skipped: true };
    }
    this.lastPresence.set(key, now);
    await this.collab.setPresence(diagramId, user.id, payload);

    client.to(this.collab.room(diagramId)).emit('collab:presence', {
      userId: user.id,
      presence: payload,
      serverTs: Date.now(),
    });

    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
@SubscribeMessage('node:create')
async onNodeCreate(@ConnectedSocket() client: Socket, @MessageBody() body: NodeCreateDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  //idempotencia
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  //permisos
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  //secuencia + persistencia
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'node:create', payload: body, authorId: user.id });

  await this.collab.maybeSnapshot(diagramId, seq, user.id);
  //broadcast(a otros)
  client.to(this.collab.room(diagramId)).emit('node:created', { seq, userId: user.id, ...body, ts: Date.now() });
  //ack al emisor
  return { ackSeq: seq, serverTs: now };
}

@UseGuards(WsJwtGuard)
@SubscribeMessage('node:update')
async onNodeUpdate(@ConnectedSocket() client: Socket, @MessageBody() body: NodeUpdateDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };

  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'node:update', payload: body, authorId: user.id });
  
  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('node:updated', { seq, userId: user.id, ...body, ts: Date.now() });
  return { ackSeq: seq, serverTs: now };
}
@UseGuards(WsJwtGuard)
@SubscribeMessage('node:move')
async onNodeMove(@ConnectedSocket() client: Socket, @MessageBody() body: NodeMoveDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'node:move', payload: body, authorId: user.id });
  
  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('node:moved', {
    seq, userId: user.id, ...body, ts: Date.now()
  });
  return { ackSeq: seq, serverTs: now };
}

@UseGuards(WsJwtGuard)
@SubscribeMessage('node:delete')
async onNodeDelete(@ConnectedSocket() client: Socket, @MessageBody() body: NodeDeleteDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'node:delete', payload: body, authorId: user.id });

  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('node:deleted', {
    seq, userId: user.id, ...body, ts: Date.now()
  });
  return { ackSeq: seq, serverTs: now };
}

// ---------- EDGE ----------
@UseGuards(WsJwtGuard)
@SubscribeMessage('edge:create')
async onEdgeCreate(@ConnectedSocket() client: Socket, @MessageBody() body: EdgeCreateDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'edge:create', payload: body, authorId: user.id });

  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('edge:created', {
    seq, userId: user.id, ...body, ts: Date.now()
  });
  return { ackSeq: seq, serverTs: now };
}

@UseGuards(WsJwtGuard)
@SubscribeMessage('edge:update')
async onEdgeUpdate(@ConnectedSocket() client: Socket, @MessageBody() body: EdgeUpdateDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  if (!(await this.collab.seen(diagramId, body.clientId, body.localSeq))) {
    return { ackSeq: null, serverTs: Date.now(), dedup: true };
  }
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'edge:update', payload: body, authorId: user.id });

  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('edge:updated', {
    seq, userId: user.id, ...body, ts: Date.now()
  });
  return { ackSeq: seq, serverTs: now };
}

@UseGuards(WsJwtGuard)
@SubscribeMessage('edge:delete')
async onEdgeDelete(@ConnectedSocket() client: Socket, @MessageBody() body: EdgeDeleteDto) {
  const user = client.data?.user; const diagramId = client.data?.diagramId;
  if (!user || !diagramId) throw new UnauthorizedException();
  const can = await this.collab.canEdit(diagramId, user.id);
  if (!can) return { error: 'FORBIDDEN', message: 'No permission to edit' };
  const seq = await this.collab.nextSeq(diagramId);
  const now = Date.now();
  const { clientId, localSeq, ...payloadToStore } = body as any;

  await this.collab.saveChange({ diagramId, seq, type: 'edge:delete', payload: body, authorId: user.id });

  await this.collab.maybeSnapshot(diagramId, seq, user.id);

  client.to(this.collab.room(diagramId)).emit('edge:deleted', {
    seq, userId: user.id, ...body, ts: Date.now()
  });
  return { ackSeq: seq, serverTs: now };
}
}