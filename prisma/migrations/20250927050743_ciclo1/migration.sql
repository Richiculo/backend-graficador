-- CreateEnum
CREATE TYPE "public"."AccessModifier" AS ENUM ('PUBLIC', 'PRIVATE', 'PROTECTED', 'PACKAGE');

-- CreateEnum
CREATE TYPE "public"."RelationType" AS ENUM ('ASSOCIATION', 'AGGREGATION', 'COMPOSITION', 'INHERITANCE', 'IMPLEMENTATION');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Diagram" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "Diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UmlClass" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stereotype" TEXT,
    "isAbstract" BOOLEAN NOT NULL DEFAULT false,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "diagramId" INTEGER NOT NULL,

    CONSTRAINT "UmlClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UmlAttribute" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "defaultValue" TEXT,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "public"."AccessModifier" NOT NULL,
    "umlClassId" INTEGER NOT NULL,

    CONSTRAINT "UmlAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UmlMethod" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "isAbstract" BOOLEAN NOT NULL DEFAULT false,
    "returnType" TEXT NOT NULL,
    "visibility" "public"."AccessModifier" NOT NULL,
    "umlClassId" INTEGER NOT NULL,

    CONSTRAINT "UmlMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UmlRelation" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "kind" "public"."RelationType" NOT NULL,
    "sourceMult" TEXT NOT NULL,
    "targetMult" TEXT NOT NULL,
    "sourceRole" TEXT,
    "targetRole" TEXT,
    "navigableAToB" BOOLEAN NOT NULL DEFAULT false,
    "navigableBToA" BOOLEAN NOT NULL DEFAULT false,
    "diagramId" INTEGER NOT NULL,

    CONSTRAINT "UmlRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "public"."User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_uuid_key" ON "public"."project"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Diagram_uuid_key" ON "public"."Diagram"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "UmlClass_uuid_key" ON "public"."UmlClass"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "UmlAttribute_uuid_key" ON "public"."UmlAttribute"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "UmlAttribute_umlClassId_order_key" ON "public"."UmlAttribute"("umlClassId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "UmlMethod_uuid_key" ON "public"."UmlMethod"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "UmlMethod_umlClassId_order_key" ON "public"."UmlMethod"("umlClassId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "UmlRelation_uuid_key" ON "public"."UmlRelation"("uuid");

-- AddForeignKey
ALTER TABLE "public"."project" ADD CONSTRAINT "project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Diagram" ADD CONSTRAINT "Diagram_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UmlClass" ADD CONSTRAINT "UmlClass_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UmlAttribute" ADD CONSTRAINT "UmlAttribute_umlClassId_fkey" FOREIGN KEY ("umlClassId") REFERENCES "public"."UmlClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UmlMethod" ADD CONSTRAINT "UmlMethod_umlClassId_fkey" FOREIGN KEY ("umlClassId") REFERENCES "public"."UmlClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UmlRelation" ADD CONSTRAINT "UmlRelation_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "public"."Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
