import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { defaultContentStatusForSubmission } from "@/lib/member-access";
import { resolveTagSlugs } from "@/lib/tag-suggest";
import { generateUniqueArticleSlug } from "@/lib/slug";
import { isContentReviewRequired } from "@/lib/app-settings";
import { isValidTermStructuredContent, normalizeTermContent } from "@/lib/term-structured";

export const dynamic = "force-dynamic";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
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
        faqJson: true,
        isPinned: true,
        publishedAt: true,
        viewCount: true,
        status: true,
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
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
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
      tagSlugs,
      faqJson,
      syncToMainSite,
      isPinned,
      status,
      reviewNote,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "标题必填" }, { status: 400 });
    }
    const isDictionary =
      (typeof categoryHref === "string" && categoryHref.startsWith("/dictionary")) ||
      (typeof subHref === "string" && subHref.startsWith("/dictionary"));
    const normalizedContent =
      isDictionary && typeof content === "string" ? normalizeTermContent(content) : typeof content === "string" ? content : "";
    if (isDictionary) {
      if (!isValidTermStructuredContent(normalizedContent)) {
        return NextResponse.json({ error: "词库内容必须按固定小标题分节格式提交" }, { status: 400 });
      }
    }
    const customSlug = typeof slug === "string" ? slug.trim() : "";
    const slugTrim = await generateUniqueArticleSlug(customSlug || title);

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

    const article = await prisma.article.create({
      data: {
        title: String(title).trim(),
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
        faqJson: typeof faqJson === "string" ? faqJson.trim() || null : null,
        tagSlugs: resolvedTagSlugs.length > 0 ? resolvedTagSlugs.join(",") : null,
        syncToMainSite: syncToMainSite === true,
        isPinned: typeof isPinned === "boolean" ? isPinned : false,
        status: safeStatus,
        authorMemberId: session.sub,
        reviewNote: typeof reviewNote === "string" ? reviewNote.trim() || null : null,
        reviewedAt: safeStatus === "approved" || safeStatus === "rejected" ? new Date() : null,
        reviewedById: safeStatus === "approved" || safeStatus === "rejected" ? session.sub : null,
      },
    });

    return NextResponse.json(article);
  } catch (e) {
    console.error("POST /api/admin/articles", e);
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "发布失败，请稍后重试";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
