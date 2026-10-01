-- DropIndex
DROP INDEX IF EXISTS "Story_status_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Story_status_score_idx";

-- CreateIndex
CREATE INDEX "Story_language_status_score_idx" ON "Story"("language", "status", "score");

-- CreateIndex
CREATE INDEX "Story_language_status_approvedAt_idx" ON "Story"("language", "status", "approvedAt");
