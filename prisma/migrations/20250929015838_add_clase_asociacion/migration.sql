-- AlterTable
ALTER TABLE "public"."UmlRelation" ADD COLUMN     "associationClassId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."UmlRelation" ADD CONSTRAINT "UmlRelation_associationClassId_fkey" FOREIGN KEY ("associationClassId") REFERENCES "public"."UmlClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
