ALTER TABLE "members"
ADD COLUMN "phone" TEXT;

CREATE INDEX "members_phone_idx" ON "members"("phone");
