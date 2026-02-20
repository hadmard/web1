-- AlterTable
ALTER TABLE "brands" ADD COLUMN "certUrl" TEXT;
ALTER TABLE "brands" ADD COLUMN "contactUrl" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "definitionText" TEXT;
ALTER TABLE "categories" ADD COLUMN "relatedTermSlugs" TEXT;
ALTER TABLE "categories" ADD COLUMN "versionLabel" TEXT;
ALTER TABLE "categories" ADD COLUMN "versionYear" INTEGER;

-- AlterTable
ALTER TABLE "sub_categories" ADD COLUMN "groupLabel" TEXT;

-- CreateTable
CREATE TABLE "category_faqs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "category_faqs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
