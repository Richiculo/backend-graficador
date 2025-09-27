// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
const prisma = new PrismaClient();

async function main() {
  // solo si no existe
  const email = 'demo@demo.com';
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    await prisma.user.create({
      data: {
        uuid: randomUUID(),
        username: 'demo',
        email,
        password: 'demo123', // en ciclo 1 sin hash
      },
    });
  }
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  console.log('User seed id=', u.id, 'uuid=', u.uuid);
}
main().finally(() => prisma.$disconnect());
