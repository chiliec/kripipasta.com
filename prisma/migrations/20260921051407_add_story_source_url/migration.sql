-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "sourceUrl" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Story_sourceUrl_idx" ON "Story"("sourceUrl");
