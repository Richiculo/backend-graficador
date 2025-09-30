import { Injectable, Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

type Presence = { id: number; email: string; name?: string; lastSeen: number };

@Injectable()
export class DiagramEventsService {
  private readonly logger = new Logger(DiagramEventsService.name);

  // por diagrama: set de streams SSE
  private streams = new Map<number, Set<Subject<MessageEvent>>>();
  // por diagrama: mapa userId -> Presence
  private presence = new Map<number, Map<number, Presence>>();

  private getStreams(diagramId: number) {
    let set = this.streams.get(diagramId);
    if (!set) {
      set = new Set();
      this.streams.set(diagramId, set);
    }
    return set;
  }

  private getPresenceMap(diagramId: number) {
    let map = this.presence.get(diagramId);
    if (!map) {
      map = new Map();
      this.presence.set(diagramId, map);
    }
    return map;
  }

  createStream(diagramId: number) {
    const subject = new Subject<MessageEvent>();
    this.getStreams(diagramId).add(subject);

    // “hola, sigo vivo”
    subject.next({ data: JSON.stringify({ type: 'ping' }) });

    return subject;
  }

  removeStream(diagramId: number, subject: Subject<MessageEvent>) {
    const set = this.getStreams(diagramId);
    set.delete(subject);
  }

  emit(diagramId: number, payload: any) {
    const msg = { data: JSON.stringify(payload) };
    for (const s of this.getStreams(diagramId)) s.next(msg);
  }

  // ───── Presencia ─────
  upsertPresence(diagramId: number, user: { id: number; email: string; name?: string }) {
    const map = this.getPresenceMap(diagramId);
    map.set(user.id, { ...user, lastSeen: Date.now() });
    this.broadcastPresence(diagramId);
  }

  removePresence(diagramId: number, userId: number) {
    const map = this.getPresenceMap(diagramId);
    map.delete(userId);
    this.broadcastPresence(diagramId);
  }

  sweepPresence(diagramId: number, ttlMs = 45_000) {
    const map = this.getPresenceMap(diagramId);
    const now = Date.now();
    let changed = false;
    for (const [uid, p] of map) {
      if (now - p.lastSeen > ttlMs) {
        map.delete(uid);
        changed = true;
      }
    }
    if (changed) this.broadcastPresence(diagramId);
  }

  broadcastPresence(diagramId: number) {
    const users = Array.from(this.getPresenceMap(diagramId).values()).map(({ lastSeen, ...u }) => u);
    this.emit(diagramId, { type: 'presence', users });
  }
}
