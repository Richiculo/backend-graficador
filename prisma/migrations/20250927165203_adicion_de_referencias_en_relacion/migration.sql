-- AlterTable
ALTER TABLE "public"."UmlRelation" ADD COLUMN     "sourceClassId" INTEGER,
ADD COLUMN     "targetClassId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."UmlRelation" ADD CONSTRAINT "UmlRelation_sourceClassId_fkey" FOREIGN KEY ("sourceClassId") REFERENCES "public"."UmlClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UmlRelation" ADD CONSTRAINT "UmlRelation_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "public"."UmlClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
