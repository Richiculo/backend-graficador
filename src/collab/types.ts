export type PresencePayload = {
  cursor?: { x: number; y: number; zoom?: number };
  selections?: string[]; // ids de nodos/edges
};

export type JoinPayload = { diagramId: number; sinceSeq?: number };

export type UserInfo = { id: number; uuid: string; email: string };