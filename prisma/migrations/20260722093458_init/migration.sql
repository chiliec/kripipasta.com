-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('STORY', 'DOSSIER');

-- CreateEnum
CREATE TYPE "ThreatLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'SEVERE', 'EXTREME');

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "contentHtml" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "authorName" TEXT NOT NULL DEFAULT '',
    "authorLink" TEXT NOT NULL DEFAULT '',
    "authorEmail" TEXT NOT NULL DEFAULT '',
    "redactor" TEXT NOT NULL DEFAULT '',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "dislikeCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "legacyId" INTEGER,
    "legacyIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryTag" (
    "storyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "StoryTag_pkey" PRIMARY KEY ("storyId","tagId")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "epithet" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "canonStatus" TEXT NOT NULL DEFAULT '',
    "threatLevel" "ThreatLevel" NOT NULL DEFAULT 'MODERATE',
    "firstSurfaced" INTEGER,
    "origin" TEXT NOT NULL DEFAULT '',
    "heroImage" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "dislikeCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierSection" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "anchor" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,

    CONSTRAINT "DossierSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierImage" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DossierImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopularityPoint" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PopularityPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "userId" TEXT,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyArchive" (
    "id" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "LegacyArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Story_legacyId_key" ON "Story"("legacyId");

-- CreateIndex
CREATE INDEX "Story_status_score_idx" ON "Story"("status", "score");

-- CreateIndex
CREATE INDEX "Story_status_createdAt_idx" ON "Story"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "StoryTag_tagId_idx" ON "StoryTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_slug_key" ON "Dossier"("slug");

-- CreateIndex
CREATE INDEX "Dossier_status_score_idx" ON "Dossier"("status", "score");

-- CreateIndex
CREATE INDEX "DossierSection_dossierId_order_idx" ON "DossierSection"("dossierId", "order");

-- CreateIndex
CREATE INDEX "DossierImage_dossierId_order_idx" ON "DossierImage"("dossierId", "order");

-- CreateIndex
CREATE INDEX "PopularityPoint_dossierId_year_idx" ON "PopularityPoint"("dossierId", "year");

-- CreateIndex
CREATE INDEX "Vote_entityType_entityId_idx" ON "Vote"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_entityType_entityId_voterId_key" ON "Vote"("entityType", "entityId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyArchive_sourceTable_sourceId_key" ON "LegacyArchive"("sourceTable", "sourceId");

-- AddForeignKey
ALTER TABLE "StoryTag" ADD CONSTRAINT "StoryTag_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTag" ADD CONSTRAINT "StoryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierSection" ADD CONSTRAINT "DossierSection_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierImage" ADD CONSTRAINT "DossierImage_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopularityPoint" ADD CONSTRAINT "PopularityPoint_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
