// prisma/seed.ts (fragmento de backfill)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillOwners() {
  const diagrams = await prisma.diagram.findMany({
    select: { id: true, project: { select: { userId: true } } },
  });

  for (const d of diagrams) {
    await prisma.diagramMember.upsert({
      where: { diagramId_userId: { diagramId: d.id, userId: d.project.userId } },
      create: { diagramId: d.id, userId: d.project.userId, role: 'OWNER' },
      update: { role: 'OWNER' },
    });
  }
}

backfillOwners().finally(() => prisma.$disconnect());
