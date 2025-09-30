-- CreateEnum
CREATE TYPE "public"."DiagramRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "public"."DiagramMember" (
    "id" SERIAL NOT NULL,
    "diagramId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "public"."DiagramRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagramMember_diagramId_role_idx" ON "public"."DiagramMember"("diagramId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramMember_diagramId_userId_key" ON "public"."DiagramMember"("diagramId", "userId");

-- AddForeignKey
ALTER TABLE "public"."DiagramMember" ADD CONSTRAINT "DiagramMember_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiagramMember" ADD CONSTRAINT "DiagramMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
