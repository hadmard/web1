import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { defaultContentStatusForSubmission } from "@/lib/member-access";
import { resolveTagSlugs } from "@/lib/tag-suggest";
import { generateUniqueArticleSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

function isDictionaryPath(input: string | null | undefined) {
  return typeof input === "string" && input.startsWith("/dictionary");
}

function isValidTermStructuredContent(input: string) {
  const sectionCount = (input.match(/<section>/g) ?? []).length;
  const headingCount = (input.match(/<h3>/g) ?? []).length;
  const paragraphCount = (input.match(/<p>/g) ?? []).length;
  return sectionCount > 0 && sectionCount === headingCount && sectionCount === paragraphCount;
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
  const where: any = {};
  if (status && ["draft", "pending", "approved", "rejected"].includes(status)) {
    where.status = status;
  }
  if (categoryHref && typeof categoryHref === "string") {
    where.OR = [{ categoryHref: { startsWith: categoryHref } }, { subHref: { startsWith: categoryHref } }];
  }

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
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
      excerpt,
      content,
      coverImage,
      subHref,
      categoryHref,
      publishedAt,
      conceptSummary,
      applicableScenarios,
      versionLabel,
      relatedTermSlugs,
      relatedStandardIds,
      relatedBrandIds,
      tagSlugs,
      syncToMainSite,
      status,
      reviewNote,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "标题必填" }, { status: 400 });
    }
    if (isDictionaryPath(categoryHref) || isDictionaryPath(subHref)) {
      if (typeof content !== "string" || !isValidTermStructuredContent(content)) {
        return NextResponse.json({ error: "词库内容必须按固定小标题分节格式提交" }, { status: 400 });
      }
    }
    const slugTrim = await generateUniqueArticleSlug(title);

    const safeStatus = isSuperAdmin(session)
      ? (typeof status === "string" && ["draft", "pending", "approved", "rejected"].includes(status) ? status : "approved")
      : defaultContentStatusForSubmission({
          reviewRequired: true,
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
        excerpt: typeof excerpt === "string" ? excerpt.trim() || null : null,
        content: typeof content === "string" ? content : "",
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
        tagSlugs: resolvedTagSlugs.length > 0 ? resolvedTagSlugs.join(",") : null,
        syncToMainSite: syncToMainSite === true,
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
