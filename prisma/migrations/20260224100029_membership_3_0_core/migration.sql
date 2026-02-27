-- AlterTable
ALTER TABLE "enterprises" ADD COLUMN "area" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "intro" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "relatedBrands" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "relatedStandards" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "relatedTerms" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "standard_feedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "standardId" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "standard_feedbacks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "standard_feedbacks_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "standards" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "subHref" TEXT,
    "categoryHref" TEXT,
    "publishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "authorMemberId" TEXT,
    "conceptSummary" TEXT,
    "applicableScenarios" TEXT,
    "faqJson" TEXT,
    "versionLabel" TEXT,
    "relatedTermSlugs" TEXT,
    "relatedStandardIds" TEXT,
    "relatedBrandIds" TEXT,
    "tagSlugs" TEXT,
    "syncToMainSite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "articles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "articles_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_articles" ("applicableScenarios", "conceptSummary", "content", "coverImage", "createdAt", "excerpt", "faqJson", "id", "publishedAt", "slug", "subHref", "title", "updatedAt", "versionLabel") SELECT "applicableScenarios", "conceptSummary", "content", "coverImage", "createdAt", "excerpt", "faqJson", "id", "publishedAt", "slug", "subHref", "title", "updatedAt", "versionLabel" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");
CREATE INDEX "articles_status_idx" ON "articles"("status");
CREATE INDEX "articles_authorMemberId_idx" ON "articles"("authorMemberId");
CREATE TABLE "new_gallery_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "authorMemberId" TEXT,
    "tagSlugs" TEXT,
    "syncToMainSite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "gallery_images_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "gallery_images_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_gallery_images" ("alt", "category", "createdAt", "id", "imageUrl", "sortOrder", "title", "updatedAt") SELECT "alt", "category", "createdAt", "id", "imageUrl", "sortOrder", "title", "updatedAt" FROM "gallery_images";
DROP TABLE "gallery_images";
ALTER TABLE "new_gallery_images" RENAME TO "gallery_images";
CREATE INDEX "gallery_images_status_idx" ON "gallery_images"("status");
CREATE INDEX "gallery_images_authorMemberId_idx" ON "gallery_images"("authorMemberId");
CREATE TABLE "new_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "membershipLevel" TEXT,
    "memberType" TEXT NOT NULL DEFAULT 'personal',
    "memberTypeExpiresAt" DATETIME,
    "autoDowngradedAt" DATETIME,
    "rankingWeight" INTEGER NOT NULL DEFAULT 0,
    "passwordHash" TEXT NOT NULL,
    "passwordPlaintext" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_members" ("createdAt", "email", "id", "membershipLevel", "name", "passwordHash", "passwordPlaintext", "role", "updatedAt") SELECT "createdAt", "email", "id", "membershipLevel", "name", "passwordHash", "passwordPlaintext", "role", "updatedAt" FROM "members";
DROP TABLE "members";
ALTER TABLE "new_members" RENAME TO "members";
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE INDEX "members_memberType_idx" ON "members"("memberType");
CREATE INDEX "members_memberTypeExpiresAt_idx" ON "members"("memberTypeExpiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "standard_feedbacks_memberId_idx" ON "standard_feedbacks"("memberId");

-- CreateIndex
CREATE INDEX "standard_feedbacks_standardId_idx" ON "standard_feedbacks"("standardId");

-- CreateIndex
CREATE INDEX "standard_feedbacks_status_idx" ON "standard_feedbacks"("status");
