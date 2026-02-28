import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canLinkStandards, canLinkTerms, defaultContentStatusForSubmission } from "@/lib/member-access";
import { writeOperationLog } from "@/lib/operation-log";
import { MEMBER_ALLOWED_CATEGORY_HREFS, PERSONAL_ALLOWED_CATEGORY_HREFS } from "@/lib/content-taxonomy";
import { resolveTagSlugs } from "@/lib/tag-suggest";
import { generateUniqueArticleSlug } from "@/lib/slug";
import { isContentReviewRequired } from "@/lib/app-settings";

const BASIC_MEMBER_NEWS_LIMIT = 20;
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where: { authorMemberId: session.sub },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.article.count({ where: { authorMemberId: session.sub } }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const reviewRequired = await isContentReviewRequired();
  const submissionStatus = defaultContentStatusForSubmission({
    reviewRequired,
    canPublishWithoutReview: session.role === "SUPER_ADMIN" || session.canPublishWithoutReview === true,
  });

  const body = await request.json().catch(() => ({}));
  const {
    title,
    excerpt,
    content,
    coverImage,
    subHref,
    categoryHref,
    relatedTermSlugs,
    relatedStandardIds,
    relatedBrandIds,
    tagSlugs,
    syncToMainSite,
  } = body;

  const categoryHrefTrim =
    typeof categoryHref === "string" ? categoryHref.trim() : "";
  if (!MEMBER_ALLOWED_CATEGORY_HREFS.has(categoryHrefTrim)) {
    return NextResponse.json({ error: "栏目非法或不支持投稿" }, { status: 400 });
  }

  if (session.memberType === "personal" && !PERSONAL_ALLOWED_CATEGORY_HREFS.has(categoryHrefTrim)) {
    return NextResponse.json({ error: "个人会员仅支持词库/标准/数据类投稿" }, { status: 403 });
  }

  if (session.memberType === "enterprise_basic") {
    const count = await prisma.article.count({ where: { authorMemberId: session.sub } });
    if (count >= BASIC_MEMBER_NEWS_LIMIT) {
      return NextResponse.json({ error: "企业基础会员发布数量已达上限" }, { status: 400 });
    }
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "标题必填" }, { status: 400 });
  }
  const slugTrim = await generateUniqueArticleSlug(title);

  const resolvedTagSlugs = resolveTagSlugs({
    manualTagInput: typeof tagSlugs === "string" ? tagSlugs : null,
    title: typeof title === "string" ? title : null,
    excerpt: typeof excerpt === "string" ? excerpt : null,
    content: typeof content === "string" ? content : null,
    categoryHref: categoryHrefTrim,
    subHref: typeof subHref === "string" ? subHref : null,
  });

  const article = await prisma.article.create({
    data: {
      title: title.trim(),
      slug: slugTrim,
      excerpt: typeof excerpt === "string" ? excerpt.trim() || null : null,
      content: typeof content === "string" ? content : "",
      coverImage: typeof coverImage === "string" ? coverImage.trim() || null : null,
      subHref: typeof subHref === "string" ? subHref.trim() || null : null,
      categoryHref: categoryHrefTrim,
      relatedTermSlugs:
        canLinkTerms(session.memberType) && typeof relatedTermSlugs === "string"
          ? relatedTermSlugs.trim() || null
          : null,
      relatedStandardIds:
        canLinkStandards(session.memberType) && typeof relatedStandardIds === "string"
          ? relatedStandardIds.trim() || null
          : null,
      relatedBrandIds: typeof relatedBrandIds === "string" ? relatedBrandIds.trim() || null : null,
      tagSlugs: resolvedTagSlugs.length > 0 ? resolvedTagSlugs.join(",") : null,
      syncToMainSite: syncToMainSite === true,
      status: submissionStatus,
      authorMemberId: session.sub,
    },
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_article_submit",
    targetType: "article",
    targetId: article.id,
    detail: JSON.stringify({ status: article.status, memberType: session.memberType }),
  });

  return NextResponse.json(article);
}
