-- AlterTable
ALTER TABLE "members" ADD COLUMN "canManageMembers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canDeleteOwnContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canDeleteMemberContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canDeleteAllContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canEditOwnContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canEditMemberContent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN "canEditAllContent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "article_change_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "patchTitle" TEXT,
    "patchSlug" TEXT,
    "patchExcerpt" TEXT,
    "patchContent" TEXT,
    "patchCoverImage" TEXT,
    "patchSubHref" TEXT,
    "patchCategoryHref" TEXT,
    "patchTagSlugs" TEXT,
    "patchRelatedTermSlugs" TEXT,
    "patchRelatedStandardIds" TEXT,
    "patchRelatedBrandIds" TEXT,
    "diffSummary" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "article_change_requests_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "article_change_requests_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "article_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "article_change_requests_articleId_idx" ON "article_change_requests"("articleId");
CREATE INDEX "article_change_requests_submitterId_idx" ON "article_change_requests"("submitterId");
CREATE INDEX "article_change_requests_status_idx" ON "article_change_requests"("status");
