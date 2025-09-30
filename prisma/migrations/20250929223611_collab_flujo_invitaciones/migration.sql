-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."DiagramInvite" (
    "id" SERIAL NOT NULL,
    "diagramId" INTEGER NOT NULL,
    "inviterId" INTEGER NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "role" "public"."DiagramRole" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "DiagramInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagramInvite_token_key" ON "public"."DiagramInvite"("token");

-- CreateIndex
CREATE INDEX "DiagramInvite_diagramId_status_idx" ON "public"."DiagramInvite"("diagramId", "status");

-- CreateIndex
CREATE INDEX "DiagramInvite_inviteeEmail_status_idx" ON "public"."DiagramInvite"("inviteeEmail", "status");

-- AddForeignKey
ALTER TABLE "public"."DiagramInvite" ADD CONSTRAINT "DiagramInvite_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiagramInvite" ADD CONSTRAINT "DiagramInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
