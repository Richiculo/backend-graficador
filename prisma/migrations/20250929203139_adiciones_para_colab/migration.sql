-- CreateTable
CREATE TABLE "public"."DiagramChange" (
    "id" SERIAL NOT NULL,
    "diagramId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiagramSnapshot" (
    "id" SERIAL NOT NULL,
    "diagramId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "authorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagramChange_diagramId_createdAt_idx" ON "public"."DiagramChange"("diagramId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramChange_diagramId_seq_key" ON "public"."DiagramChange"("diagramId", "seq");

-- CreateIndex
CREATE INDEX "DiagramSnapshot_diagramId_createdAt_idx" ON "public"."DiagramSnapshot"("diagramId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramSnapshot_diagramId_version_key" ON "public"."DiagramSnapshot"("diagramId", "version");

-- AddForeignKey
ALTER TABLE "public"."DiagramChange" ADD CONSTRAINT "DiagramChange_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiagramSnapshot" ADD CONSTRAINT "DiagramSnapshot_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
