import { RelationType } from '@prisma/client';

export class CreateUmlRelationDto {
  kind: RelationType;
  sourceClassId: number;
  targetClassId: number;
  sourceMult: string; // e.g. "1", "0..*", "1..*"
  targetMult: string;
  sourceRole?: string;
  targetRole?: string;
  navigableAToB?: boolean;
  navigableBToA?: boolean;

  // ⬇️ NUEVO (opcional)
  associationClassId?: number | null;
}
