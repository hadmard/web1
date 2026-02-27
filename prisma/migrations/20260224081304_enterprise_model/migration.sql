-- CreateTable
CREATE TABLE "enterprises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "positioning" TEXT,
    "productSystem" TEXT,
    "craftLevel" TEXT,
    "region" TEXT,
    "certifications" TEXT,
    "awards" TEXT,
    "contactInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "enterprises_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_memberId_key" ON "enterprises"("memberId");
