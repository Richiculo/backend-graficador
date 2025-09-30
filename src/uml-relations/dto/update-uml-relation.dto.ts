import { RelationType } from '@prisma/client';

export class UpdateUmlRelationDto {
  kind?: RelationType;
  sourceClassId?: number | null;
  targetClassId?: number | null;
  sourceMult?: string;
  targetMult?: string;
  sourceRole?: string | null;
  targetRole?: string | null;
  navigableAToB?: boolean;
  navigableBToA?: boolean;

  // ⬇️ NUEVO (opcional)
  associationClassId?: number | null;
}
