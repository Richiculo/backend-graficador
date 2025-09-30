import { Injectable } from '@nestjs/common'

type Presence = { id: number; email: string; name?: string; until: number }
@Injectable()
export class PresenceService {
  private map = new Map<number, Map<number, Presence>>() // diagramId -> userId -> presence
  private ttlMs = 30_000

  heartbeat(diagramId: number, u: { id: number; email: string; name?: string }) {
    const until = Date.now() + this.ttlMs
    const m = this.map.get(diagramId) ?? new Map()
    m.set(u.id, { id: u.id, email: u.email, name: u['username'], until })
    this.map.set(diagramId, m)
    this.gc(diagramId)
    return this.list(diagramId)
  }

  list(diagramId: number) {
    const now = Date.now()
    const m = this.map.get(diagramId) ?? new Map()
    return [...m.values()].filter(p => p.until > now).map(({until, ...rest}) => rest)
  }

  private gc(diagramId: number) {
    const now = Date.now()
    const m = this.map.get(diagramId)
    if (!m) return
    for (const [id, p] of m) if (p.until <= now) m.delete(id)
  }
}
