import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { defaultContentStatusForSubmission } from "@/lib/member-access";
import { resolveTagSlugs } from "@/lib/tag-suggest";
import { generateUniqueArticleSlug } from "@/lib/slug";
import { isContentReviewRequired } from "@/lib/app-settings";
import { isValidTermStructuredContent, normalizeTermContent } from "@/lib/term-structured";
import { findDuplicateArticleByTitle, normalizeArticleTitle } from "@/lib/article-title";
import { formatKeywordCsv, syncArticleKeywords } from "@/lib/news-keywords-v2";

export const dynamic = "force-dynamic";

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("title")) return "\u6807\u9898\u5df2\u5b58\u5728\uff0c\u8bf7\u66f4\u6362\u4e00\u4e2a\u65b0\u7684\u6807\u9898";
      if (target.includes("slug")) return "Slug \u5df2\u5b58\u5728\uff0c\u8bf7\u66f4\u6362\u4e00\u4e2a\u65b0\u7684 slug";
      return "\u5b58\u5728\u91cd\u590d\u6570\u636e\uff0c\u8bf7\u68c0\u67e5\u6807\u9898\u6216 slug";
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return `${fallback}\uFF1A${message}`;
  }

  return fallback;
}

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const status = searchParams.get("status");
  const categoryHref = searchParams.get("categoryHref");
  const q = searchParams.get("q")?.trim();
  const where: any = {};
  if (status && ["draft", "pending", "approved", "rejected"].includes(status)) {
    where.status = status;
  }
  if (categoryHref && typeof categoryHref === "string") {
    where.OR = [{ categoryHref: { startsWith: categoryHref } }, { subHref: { startsWith: categoryHref } }];
  }
  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { source: { contains: q, mode: "insensitive" } },
          { displayAuthor: { contains: q, mode: "insensitive" } },
          { tagSlugs: { contains: q, mode: "insensitive" } },
          { keywords: { contains: q, mode: "insensitive" } },
          { manualKeywords: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        source: true,
        sourceUrl: true,
        displayAuthor: true,
        excerpt: true,
        content: true,
        coverImage: true,
        subHref: true,
        categoryHref: true,
        tagSlugs: true,
        keywords: true,
        manualKeywords: true,
        recommendIds: true,
        faqJson: true,
        isPinned: true,
        publishedAt: true,
        viewCount: true,
        status: true,
        ownedEnterpriseId: true,
        ownedEnterprise: {
          select: {
            id: true,
            companyName: true,
            companyShortName: true,
          },
        },
        authorMember: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
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
      manualKeywords,
      recommendIds,
      faqJson,
      syncToMainSite,
      isPinned,
      status,
      reviewNote,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "\u6807\u9898\u5fc5\u586b" }, { status: 400 });
    }
    const normalizedTitle = normalizeArticleTitle(title);
    const existingTitle = await findDuplicateArticleByTitle(normalizedTitle);
    if (existingTitle) {
      return NextResponse.json({ error: "\u6807\u9898\u5df2\u5b58\u5728\uff0c\u8bf7\u66f4\u6362\u4e00\u4e2a\u65b0\u7684\u6807\u9898" }, { status: 400 });
    }
    const isDictionary =
      (typeof categoryHref === "string" && categoryHref.startsWith("/dictionary")) ||
      (typeof subHref === "string" && subHref.startsWith("/dictionary"));
    const normalizedContent =
      isDictionary && typeof content === "string" ? normalizeTermContent(content) : typeof content === "string" ? content : "";
    if (isDictionary) {
      if (!isValidTermStructuredContent(normalizedContent)) {
        return NextResponse.json({ error: "\u8bcd\u5e93\u5185\u5bb9\u5fc5\u987b\u6309\u56fa\u5b9a\u5c0f\u6807\u9898\u5206\u8282\u683c\u5f0f\u63d0\u4ea4" }, { status: 400 });
      }
    }
    const customSlug = typeof slug === "string" ? slug.trim() : "";
    const slugTrim = await generateUniqueArticleSlug(customSlug || normalizedTitle);

    const reviewRequired = await isContentReviewRequired();
    const safeStatus = isSuperAdmin(session)
      ? (typeof status === "string" && ["draft", "pending", "approved", "rejected"].includes(status) ? status : "approved")
      : defaultContentStatusForSubmission({
          reviewRequired,
          role: session.role,
          canPublishWithoutReview: session.canPublishWithoutReview === true,
        });

    const resolvedPublishedAt =
      publishedAt === true || publishedAt === "true"
        ? new Date()
        : publishedAt
          ? new Date(publishedAt)
          : safeStatus === "approved"
            ? new Date()
            : null;

    const resolvedTagSlugs = resolveTagSlugs({
      manualTagInput: typeof tagSlugs === "string" ? tagSlugs : null,
      title: typeof title === "string" ? title : null,
      excerpt: typeof excerpt === "string" ? excerpt : null,
      content: typeof content === "string" ? content : null,
      categoryHref: typeof categoryHref === "string" ? categoryHref : null,
      subHref: typeof subHref === "string" ? subHref : null,
    });

    const normalizedOwnedEnterpriseId =
      typeof ownedEnterpriseId === "string" && ownedEnterpriseId.trim() ? ownedEnterpriseId.trim() : null;

    if (normalizedOwnedEnterpriseId) {
      const ownedEnterprise = await prisma.enterprise.findUnique({
        where: { id: normalizedOwnedEnterpriseId },
        select: { id: true },
      });
      if (!ownedEnterprise) {
        return NextResponse.json({ error: "\u5f52\u5c5e\u4f01\u4e1a\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u5220\u9664" }, { status: 400 });
      }
    }

    const article = await prisma.article.create({
      data: {
        title: normalizedTitle,
        slug: slugTrim,
        source: typeof source === "string" ? source.trim() || null : null,
        sourceUrl: typeof sourceUrl === "string" ? sourceUrl.trim() || null : null,
        displayAuthor: typeof displayAuthor === "string" ? displayAuthor.trim() || null : null,
        excerpt: typeof excerpt === "string" ? excerpt.trim() || null : null,
        content: normalizedContent,
        coverImage: typeof coverImage === "string" ? coverImage.trim() || null : null,
        subHref: typeof subHref === "string" ? subHref.trim() || null : null,
        categoryHref: typeof categoryHref === "string" ? categoryHref.trim() || null : null,
        publishedAt: resolvedPublishedAt,
        conceptSummary: typeof conceptSummary === "string" ? conceptSummary.trim() || null : null,
        applicableScenarios: typeof applicableScenarios === "string" ? applicableScenarios.trim() || null : null,
        versionLabel: typeof versionLabel === "string" ? versionLabel.trim() || null : null,
        relatedTermSlugs: typeof relatedTermSlugs === "string" ? relatedTermSlugs.trim() || null : null,
        relatedStandardIds: typeof relatedStandardIds === "string" ? relatedStandardIds.trim() || null : null,
        relatedBrandIds: typeof relatedBrandIds === "string" ? relatedBrandIds.trim() || null : null,
        ownedEnterpriseId: normalizedOwnedEnterpriseId,
        faqJson: typeof faqJson === "string" ? faqJson.trim() || null : null,
        tagSlugs: resolvedTagSlugs.length > 0 ? resolvedTagSlugs.join(",") : null,
        manualKeywords: typeof manualKeywords === "string" ? formatKeywordCsv(manualKeywords.split(/[,\n，]+/)) || null : null,
        recommendIds: typeof recommendIds === "string" ? recommendIds.trim() || null : null,
        syncToMainSite: syncToMainSite === true,
        isPinned: typeof isPinned === "boolean" ? isPinned : false,
        status: safeStatus,
        authorMemberId: session.sub,
        reviewNote: typeof reviewNote === "string" ? reviewNote.trim() || null : null,
        reviewedAt: safeStatus === "approved" || safeStatus === "rejected" ? new Date() : null,
        reviewedById: safeStatus === "approved" || safeStatus === "rejected" ? session.sub : null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        categoryHref: true,
        subHref: true,
        status: true,
        ownedEnterpriseId: true,
        ownedEnterprise: {
          select: {
            id: true,
            companyName: true,
            companyShortName: true,
          },
        },
      },
    });

    try {
      await syncArticleKeywords({
        articleId: article.id,
        title: normalizedTitle,
        content: normalizedContent,
        manualKeywords: typeof manualKeywords === "string" ? manualKeywords : null,
      });
    } catch (keywordError) {
      await prisma.newsKeyword.deleteMany({ where: { newsId: article.id } }).catch(() => undefined);
      await prisma.article.delete({ where: { id: article.id } }).catch(() => undefined);
      const reason = getMutationErrorMessage(keywordError, "\u5173\u952e\u8bcd\u540c\u6b65\u5931\u8d25");
      return NextResponse.json(
        { error: `\u53d1\u5e03\u5931\u8d25\uff1a${reason}\u3002\u672c\u6b21\u6587\u7ae0\u672a\u4fdd\u5b58\uff0c\u8bf7\u4fee\u6b63\u540e\u91cd\u8bd5\u3002` },
        { status: 500 },
      );
    }

    return NextResponse.json(article);
  } catch (e) {
    console.error("POST /api/admin/articles", e);
    const msg = getMutationErrorMessage(e, "\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

