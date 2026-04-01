import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";
import { canChangeReviewStatus, canDirectlyDeleteArticle, canDirectlyEditArticle, canReviewSubmissions } from "@/lib/content-permissions";
import { isValidTermStructuredContent, normalizeTermContent } from "@/lib/term-structured";
import { findDuplicateArticleByTitle, normalizeArticleTitle } from "@/lib/article-title";
import { formatKeywordCsv, syncArticleKeywords } from "@/lib/news-keywords-v2";
import { buildNewsPath } from "@/lib/share-config";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isDictionaryPath(input: string | null | undefined) {
  return typeof input === "string" && input.startsWith("/dictionary");
}

function revalidateArticlePaths(article: {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
  ownedEnterpriseId?: string | null;
}) {
  const segment = (article.slug || article.title || "").trim();
  const isDictionary =
    article.categoryHref?.startsWith("/dictionary") || article.subHref?.startsWith("/dictionary");

  if (isDictionary) {
    revalidatePath("/dictionary");
    revalidatePath("/dictionary/all");
    if (segment) {
      revalidatePath(`/dictionary/${encodeURIComponent(segment)}`);
    }
  }

  const isNews =
    article.categoryHref?.startsWith("/news") || article.subHref?.startsWith("/news");
  if (isNews) {
    revalidatePath("/news");
    revalidatePath("/news/all");
    if (article.subHref) {
      revalidatePath(article.subHref);
    }
    if (article.id) {
      revalidatePath(buildNewsPath(article.id));
    }
    if (segment) {
      revalidatePath(`/news/${encodeURIComponent(segment)}`);
    }
  }

  if (article.ownedEnterpriseId) {
    revalidatePath(`/enterprise/${article.ownedEnterpriseId}`);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !canReviewSubmissions(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(article);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !canReviewSubmissions(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      authorMemberId: true,
      publishedAt: true,
      categoryHref: true,
      subHref: true,
      ownedEnterpriseId: true,
    },
  });
  if (!target) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const body = await request.json();
  const {
    title,
    slug,
    excerpt,
    content,
    coverImage,
    subHref,
    categoryHref,
    publishedAt,
    source,
    sourceUrl,
    displayAuthor,
    conceptSummary,
    applicableScenarios,
    versionLabel,
    relatedTermSlugs,
    relatedStandardIds,
    relatedBrandIds,
    ownedEnterpriseId,
    tagSlugs,
    faqJson,
    syncToMainSite,
    isPinned,
    status,
    reviewNote,
    manualKeywords,
    recommendIds,
  } = body;

  const nextCategoryHref =
    typeof categoryHref === "string" ? categoryHref.trim() || null : target.categoryHref;
  const nextSubHref =
    typeof subHref === "string" ? subHref.trim() || null : target.subHref;
  const isDictionary = isDictionaryPath(nextCategoryHref) || isDictionaryPath(nextSubHref);

  const data: Record<string, unknown> = {};
  if (typeof title === "string") data.title = normalizeArticleTitle(title);
  if (typeof slug === "string") {
    const s = slug.trim();
    if (s) {
      const existing = await prisma.article.findFirst({ where: { slug: s, NOT: { id } } });
      if (existing) return NextResponse.json({ error: "该 slug 已存在" }, { status: 400 });
      data.slug = s;
    }
  }
  if (typeof excerpt === "string") data.excerpt = excerpt.trim() || null;
  if (typeof source === "string") data.source = source.trim() || null;
  if (typeof sourceUrl === "string") data.sourceUrl = sourceUrl.trim() || null;
  if (typeof displayAuthor === "string") data.displayAuthor = displayAuthor.trim() || null;
  if (typeof content === "string") data.content = isDictionary ? normalizeTermContent(content) : content;
  if (typeof coverImage === "string") data.coverImage = coverImage.trim() || null;
  if (typeof subHref === "string") data.subHref = subHref.trim() || null;
  if (typeof categoryHref === "string") data.categoryHref = categoryHref.trim() || null;
  if (typeof conceptSummary === "string") data.conceptSummary = conceptSummary.trim() || null;
  if (typeof applicableScenarios === "string") data.applicableScenarios = applicableScenarios.trim() || null;
  if (typeof versionLabel === "string") data.versionLabel = versionLabel.trim() || null;
  if (typeof relatedTermSlugs === "string") data.relatedTermSlugs = relatedTermSlugs.trim() || null;
  if (typeof relatedStandardIds === "string") data.relatedStandardIds = relatedStandardIds.trim() || null;
  if (typeof relatedBrandIds === "string") data.relatedBrandIds = relatedBrandIds.trim() || null;
  if (ownedEnterpriseId === null || (typeof ownedEnterpriseId === "string" && !ownedEnterpriseId.trim())) {
    data.ownedEnterpriseId = null;
  } else if (typeof ownedEnterpriseId === "string") {
    const normalizedOwnedEnterpriseId = ownedEnterpriseId.trim();
    const ownedEnterprise = await prisma.enterprise.findUnique({
      where: { id: normalizedOwnedEnterpriseId },
      select: { id: true },
    });
    if (!ownedEnterprise) {
      return NextResponse.json({ error: "归属企业不存在或已被删除" }, { status: 400 });
    }
    data.ownedEnterpriseId = normalizedOwnedEnterpriseId;
  }
  if (typeof tagSlugs === "string") data.tagSlugs = tagSlugs.trim() || null;
  if (typeof manualKeywords === "string") data.manualKeywords = formatKeywordCsv(manualKeywords.split(/[,\n，]+/)) || null;
  if (typeof recommendIds === "string") data.recommendIds = recommendIds.trim() || null;
  if (typeof faqJson === "string") data.faqJson = faqJson.trim() || null;
  if (typeof isPinned === "boolean") data.isPinned = isPinned;
  if (syncToMainSite !== undefined) data.syncToMainSite = syncToMainSite === true;

  if (publishedAt !== undefined) {
    data.publishedAt =
      publishedAt === true || publishedAt === "true"
        ? new Date()
        : publishedAt
          ? new Date(publishedAt)
          : null;
  }

  if (typeof status === "string" && ["draft", "pending", "approved", "rejected"].includes(status)) {
    if (!canChangeReviewStatus(session)) {
      return NextResponse.json({ error: "仅主管理员可执行审核状态变更" }, { status: 403 });
    }
    data.status = status;
    data.reviewedAt = status === "approved" || status === "rejected" ? new Date() : null;
    data.reviewedById = session.sub;
    if (status === "approved" && publishedAt === undefined && !target.publishedAt) {
      data.publishedAt = new Date();
    }
  }
  if (typeof reviewNote === "string") data.reviewNote = reviewNote.trim() || null;
  if (typeof data.title === "string") {
    const existingTitle = await findDuplicateArticleByTitle(data.title, id);
    if (existingTitle) {
      return NextResponse.json({ error: "标题已存在，请更换一个新的标题" }, { status: 400 });
    }
  }

  if (isDictionary && typeof data.content === "string" && !isValidTermStructuredContent(data.content as string)) {
    return NextResponse.json({ error: "词库内容必须按固定小标题分节格式提交" }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  if (typeof data.status !== "string" && !canDirectlyEditArticle(session, target)) {
    return NextResponse.json({ error: "当前账号没有直接修改权限，请提交修改申请" }, { status: 403 });
  }

  const article = await prisma.article.update({
    where: { id },
    data,
    select: {
      id: true,
      slug: true,
      title: true,
      source: true,
      sourceUrl: true,
      displayAuthor: true,
      categoryHref: true,
      subHref: true,
      authorMemberId: true,
      publishedAt: true,
      excerpt: true,
      content: true,
      coverImage: true,
      tagSlugs: true,
      keywords: true,
      manualKeywords: true,
      recommendIds: true,
      isPinned: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      reviewedById: true,
      updatedAt: true,
      createdAt: true,
      conceptSummary: true,
      applicableScenarios: true,
      versionLabel: true,
      relatedTermSlugs: true,
      relatedStandardIds: true,
      relatedBrandIds: true,
      ownedEnterpriseId: true,
      ownedEnterprise: {
        select: {
          id: true,
          companyName: true,
          companyShortName: true,
        },
      },
      faqJson: true,
      syncToMainSite: true,
    },
  });
  if (
    typeof data.title === "string" ||
    typeof data.content === "string" ||
    typeof data.manualKeywords === "string" ||
    data.manualKeywords === null
  ) {
    await syncArticleKeywords({
      articleId: article.id,
      title: article.title,
      content: article.content,
      manualKeywords: article.manualKeywords,
    });
  }
  revalidateArticlePaths(article);
  if (typeof data.status === "string") {
    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "article_review_status_change",
      targetType: "article",
      targetId: id,
      detail: JSON.stringify({ status: data.status }),
    });
  }
  return NextResponse.json(article);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.article.findUnique({
    where: { id },
    select: { id: true, authorMemberId: true },
  });
  if (!target) return NextResponse.json({ error: "未找到" }, { status: 404 });
  if (!canDirectlyDeleteArticle(session, target)) {
    return NextResponse.json({ error: "当前账号没有删除权限" }, { status: 403 });
  }
  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
