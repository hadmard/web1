CREATE TABLE "buying_faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buying_faqs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "buying_faqs_visible_sort_idx" ON "buying_faqs"("visible", "sort");
