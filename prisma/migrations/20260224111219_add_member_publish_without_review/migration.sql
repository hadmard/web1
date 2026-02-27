-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "membershipLevel" TEXT,
    "memberType" TEXT NOT NULL DEFAULT 'personal',
    "canPublishWithoutReview" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_members" ("autoDowngradedAt", "createdAt", "email", "failedLoginCount", "id", "lastLoginAt", "lockedUntil", "memberType", "memberTypeExpiresAt", "membershipLevel", "name", "passwordHash", "passwordPlaintext", "rankingWeight", "role", "updatedAt") SELECT "autoDowngradedAt", "createdAt", "email", "failedLoginCount", "id", "lastLoginAt", "lockedUntil", "memberType", "memberTypeExpiresAt", "membershipLevel", "name", "passwordHash", "passwordPlaintext", "rankingWeight", "role", "updatedAt" FROM "members";
DROP TABLE "members";
ALTER TABLE "new_members" RENAME TO "members";
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE INDEX "members_memberType_idx" ON "members"("memberType");
CREATE INDEX "members_memberTypeExpiresAt_idx" ON "members"("memberTypeExpiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
