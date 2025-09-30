import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class CollabService {
  private redis!: RedisClientType;
  constructor(public prisma: PrismaService) {
    // Cliente independiente para KV presence (además del adapter)
    this.redis = createClient({ url: env.REDIS_URL });
    this.redis.connect().catch(err => {
      // eslint-disable-next-line no-console
      console.error('Redis presence connect error', err);
    });
  }
  room(diagramId: number) {
    return `room:diagram:${diagramId}`;
  }

  presenceKey(diagramId: number) {
    return `presence:diagram:${diagramId}`;
  }

  async setPresence(diagramId: number, userId: number, presence: any) {
    await this.redis.hSet(this.presenceKey(diagramId), String(userId), JSON.stringify(presence));
    // TTL opcional para limpiar fantasmas
    await this.redis.expire(this.presenceKey(diagramId), 60);
  }

  async removePresence(diagramId: number, userId: number) {
    await this.redis.hDel(this.presenceKey(diagramId), String(userId));
  }

  async listPresence(diagramId: number) {
    const entries = await this.redis.hGetAll(this.presenceKey(diagramId));
    return Object.entries(entries).map(([uid, json]) => ({ userId: Number(uid), presence: JSON.parse(json) }));
  }

  // por sesión/diagrama, monotónico
async nextSeq(diagramId: number) {
  if (this.redis) return Number(await this.redis.incr(`seq:diagram:${diagramId}`));
  // fallback memoria:
  const key = `seq:${diagramId}`;
  // @ts-ignore
  global.__seq ||= new Map<number, number>();
  // @ts-ignore
  const cur = (global.__seq.get(diagramId) ?? 0) + 1;
  // @ts-ignore
  global.__seq.set(diagramId, cur);
  return cur;
}

async saveChange(params: {
    diagramId: number;
    seq: number;
    type: string;
    payload: any;
    authorId: number;
  }) {
    const { diagramId, seq, type, payload, authorId } = params;
    await this.prisma.diagramChange.create({
      data: { diagramId, seq, type, payload, authorId },
    });
  }

  async getChangesSince(diagramId: number, sinceSeq: number) {
    return this.prisma.diagramChange.findMany({
      where: { diagramId, seq: { gt: sinceSeq } },
      orderBy: { seq: 'asc' },
      take: 1000, // límite razonable
      select: { seq: true, type: true, payload: true, authorId: true, createdAt: true },
    });
  }

  // (opcional) snapshot periódico
  async saveSnapshot(params: { diagramId: number; version: number; payload: any; authorId?: number }) {
    const { diagramId, version, payload, authorId } = params;
    await this.prisma.diagramSnapshot.create({
      data: { diagramId, version, payload, authorId },
    });
  }
  async seen(diagramId:number, clientId:string, localSeq:number) {
  if (this.redis) {
    const key = `idem:${diagramId}:${clientId}`;
    const field = String(localSeq);
    const ok = await this.redis.hSetNX(key, field, '1');
    await this.redis.expire(key, 3600);
    return ok === 1; // true si NO visto antes
  }
  // fallback memoria
  // @ts-ignore
  global.__idem ??= new Map<string, Set<number>>();
  const k = `${diagramId}:${clientId}`;
  const set = global.__idem.get(k) ?? new Set<number>();
  if (set.has(localSeq)) return false;
  set.add(localSeq); global.__idem.set(k, set); return true;
  }
  async getFullState(diagramId: number) {
  // Ajusta selects a tus necesidades/contratos del front
  const [classes, relations] = await Promise.all([
    this.prisma.umlClass.findMany({
      where: { diagramId },
      select: {
        id: true, uuid: true, name: true, stereotype: true, isAbstract: true, x: true, y: true,
        attributes: { select: { id: true, uuid: true, name: true, type: true, order: true, defaultValue: true, isReadOnly: true, isStatic: true, visibility: true } },
        methods: { select: { id: true, uuid: true, name: true, order: true, isStatic: true, isAbstract: true, returnType: true, visibility: true } },
      },
      orderBy: { id: 'asc' },
    }),
    this.prisma.umlRelation.findMany({
      where: { diagramId },
      select: {
        id: true, uuid: true, kind: true, sourceMult: true, targetMult: true,
        sourceRole: true, targetRole: true, navigableAToB: true, navigableBToA: true,
        sourceClassId: true, targetClassId: true, associationClassId: true,
      },
      orderBy: { id: 'asc' },
    }),
  ]);

  return { classes, relations };
}
async maybeSnapshot(diagramId: number, seq: number, authorId?: number) {
  if (seq % 100 !== 0) return;
  const payload = await this.getFullState(diagramId);
  await this.saveSnapshot({ diagramId, version: seq, payload, authorId });
}

async canEdit(diagramId: number, userId: number) {
  const member = await this.prisma.diagramMember.findUnique({
    where: { diagramId_userId: { diagramId, userId } },
    select: { role: true },
  });
  if (member) return member.role === 'OWNER' || member.role === 'EDITOR';
  const d = await this.prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { project: { select: { userId: true } } },
  });
  return !!d && d.project.userId === userId;
}

async canView(diagramId: number, userId: number) {
  const member = await this.prisma.diagramMember.findUnique({
    where: { diagramId_userId: { diagramId, userId } },
    select: { role: true },
  });
  if (member) return true;
  const d = await this.prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { project: { select: { userId: true } } },
  });
  return !!d && d.project.userId === userId;
}

async canManageMembers(diagramId: number, userId: number): Promise<boolean> {
  // Solo OWNER gestiona miembros
  const m = await this.prisma.diagramMember.findUnique({
    where: { diagramId_userId: { diagramId, userId } },
    select: { role: true },
  });
  if (m?.role === 'OWNER') return true;

  // Fallback por si aún no existiera la membresía del owner (legacy)
  const d = await this.prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { project: { select: { userId: true } } },
  });
  return !!d && d.project.userId === userId;
}
}
