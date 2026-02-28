-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "background" TEXT,
    "features" TEXT,
    "structure" TEXT,
    "significance" TEXT,
    "version" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "content" TEXT,
    "version" TEXT,
    "publisher" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "levelDescription" TEXT,
    "versionHistory" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "positioning" TEXT,
    "materialSystem" TEXT,
    "productStructure" TEXT,
    "priceRange" TEXT,
    "targetAudience" TEXT,
    "businessModel" TEXT,
    "contactUrl" TEXT,
    "certUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_data" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "methodology" TEXT,
    "content" TEXT,
    "year" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "membershipLevel" TEXT,
    "memberType" TEXT NOT NULL DEFAULT 'personal',
    "canPublishWithoutReview" BOOLEAN NOT NULL DEFAULT false,
    "canManageMembers" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteOwnContent" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteMemberContent" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteAllContent" BOOLEAN NOT NULL DEFAULT false,
    "canEditOwnContent" BOOLEAN NOT NULL DEFAULT false,
    "canEditMemberContent" BOOLEAN NOT NULL DEFAULT false,
    "canEditAllContent" BOOLEAN NOT NULL DEFAULT false,
    "memberTypeExpiresAt" TIMESTAMP(3),
    "autoDowngradedAt" TIMESTAMP(3),
    "rankingWeight" INTEGER NOT NULL DEFAULT 0,
    "passwordHash" TEXT NOT NULL,
    "passwordPlaintext" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprises" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "companyName" TEXT,
    "companyShortName" TEXT,
    "contactPerson" TEXT,
    "website" TEXT,
    "address" TEXT,
    "licenseCode" TEXT,
    "foundedAt" TEXT,
    "registeredCapital" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'approved',
    "verifiedAt" TIMESTAMP(3),
    "intro" TEXT,
    "logoUrl" TEXT,
    "positioning" TEXT,
    "productSystem" TEXT,
    "craftLevel" TEXT,
    "region" TEXT,
    "area" TEXT,
    "certifications" TEXT,
    "awards" TEXT,
    "contactInfo" TEXT,
    "contactPhone" TEXT,
    "relatedStandards" TEXT,
    "relatedTerms" TEXT,
    "relatedBrands" TEXT,
    "videoUrl" TEXT,
    "sourceVerificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_verifications" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyShortName" TEXT,
    "accountName" TEXT NOT NULL,
    "accountPassword" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "licenseImageUrl" TEXT NOT NULL,
    "licenseCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "foundedAt" TEXT,
    "registeredCapital" TEXT,
    "website" TEXT,
    "intro" TEXT,
    "businessScope" TEXT,
    "productSystem" TEXT,
    "coreAdvantages" TEXT,
    "attachmentsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "approvedEnterpriseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "definitionText" TEXT,
    "versionLabel" TEXT,
    "versionYear" INTEGER,
    "relatedTermSlugs" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "groupLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_faqs" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "subHref" TEXT,
    "categoryHref" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_change_requests" (
    "id" TEXT NOT NULL,
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
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "coverImage" TEXT,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "authorMemberId" TEXT,
    "tagSlugs" TEXT,
    "syncToMainSite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceLabel" TEXT,
    "sourceHref" TEXT,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_feedbacks" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "standardId" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standard_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terms_slug_key" ON "terms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_memberType_idx" ON "members"("memberType");

-- CreateIndex
CREATE INDEX "members_memberTypeExpiresAt_idx" ON "members"("memberTypeExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_memberId_key" ON "enterprises"("memberId");

-- CreateIndex
CREATE INDEX "enterprise_verifications_memberId_status_idx" ON "enterprise_verifications"("memberId", "status");

-- CreateIndex
CREATE INDEX "enterprise_verifications_status_idx" ON "enterprise_verifications"("status");

-- CreateIndex
CREATE INDEX "enterprise_verifications_reviewedById_idx" ON "enterprise_verifications"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "categories_href_key" ON "categories"("href");

-- CreateIndex
CREATE UNIQUE INDEX "tags_type_slug_key" ON "tags"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_authorMemberId_idx" ON "articles"("authorMemberId");

-- CreateIndex
CREATE INDEX "article_change_requests_articleId_idx" ON "article_change_requests"("articleId");

-- CreateIndex
CREATE INDEX "article_change_requests_submitterId_idx" ON "article_change_requests"("submitterId");

-- CreateIndex
CREATE INDEX "article_change_requests_status_idx" ON "article_change_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "awards_slug_key" ON "awards"("slug");

-- CreateIndex
CREATE INDEX "gallery_images_status_idx" ON "gallery_images"("status");

-- CreateIndex
CREATE INDEX "gallery_images_authorMemberId_idx" ON "gallery_images"("authorMemberId");

-- CreateIndex
CREATE INDEX "standard_feedbacks_memberId_idx" ON "standard_feedbacks"("memberId");

-- CreateIndex
CREATE INDEX "standard_feedbacks_standardId_idx" ON "standard_feedbacks"("standardId");

-- CreateIndex
CREATE INDEX "standard_feedbacks_status_idx" ON "standard_feedbacks"("status");

-- CreateIndex
CREATE INDEX "operation_logs_actorId_idx" ON "operation_logs"("actorId");

-- CreateIndex
CREATE INDEX "operation_logs_action_idx" ON "operation_logs"("action");

-- CreateIndex
CREATE INDEX "operation_logs_targetType_idx" ON "operation_logs"("targetType");

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "enterprises_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_verifications" ADD CONSTRAINT "enterprise_verifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_verifications" ADD CONSTRAINT "enterprise_verifications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_faqs" ADD CONSTRAINT "category_faqs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_change_requests" ADD CONSTRAINT "article_change_requests_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_change_requests" ADD CONSTRAINT "article_change_requests_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_change_requests" ADD CONSTRAINT "article_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_feedbacks" ADD CONSTRAINT "standard_feedbacks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_feedbacks" ADD CONSTRAINT "standard_feedbacks_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

