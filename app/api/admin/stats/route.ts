import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CONTENT_TAB_DEFS, resolveTabKeyFromHref, type ContentTabKey } from "@/lib/content-taxonomy";

export const dynamic = "force-dynamic";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDayKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildRecentDayBuckets(days: number) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1));
    return {
      key: formatDayKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      date,
    };
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const recentBuckets = buildRecentDayBuckets(7);
  const recentStart = recentBuckets[0]?.date ?? startOfDay(new Date());

  const [
    totalMembers,
    todayMembers,
    enterpriseMembers,
    totalEnterprises,
    approvedArticles,
    draftArticles,
    pendingArticles,
    rejectedArticles,
    pendingChanges,
    pendingEnterpriseVerifications,
    pendingGallery,
    pendingStandardFeedback,
    totalQuestions,
    answeredQuestions,
    articleViewAggregate,
    approvedArticleRows,
    recentPublishedArticles,
    recentMembers,
    recentQuestions,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { createdAt: { gte: recentBuckets[6]?.date ?? recentStart } } }),
    prisma.member.count({ where: { memberType: { in: ["enterprise_basic", "enterprise_advanced"] } } }),
    prisma.enterprise.count(),
    prisma.article.count({ where: { status: "approved" } }),
    prisma.article.count({ where: { status: "draft" } }),
    prisma.article.count({ where: { status: "pending" } }),
    prisma.article.count({ where: { status: "rejected" } }),
    prisma.articleChangeRequest.count({ where: { status: "pending" } }),
    prisma.enterpriseVerification.count({ where: { status: "pending" } }),
    prisma.galleryImage.count({ where: { status: "pending" } }),
    prisma.standardFeedback.count({ where: { status: "pending" } }),
    prisma.userQuestion.count(),
    prisma.userQuestion.count({ where: { answeredAt: { not: null } } }),
    prisma.article.aggregate({
      where: { status: "approved" },
      _sum: { viewCount: true },
      _avg: { viewCount: true },
    }),
    prisma.article.findMany({
      where: { status: "approved" },
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        publishedAt: true,
        categoryHref: true,
        subHref: true,
      },
      orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
      take: 1000,
    }),
    prisma.article.findMany({
      where: { status: "approved", publishedAt: { gte: recentStart } },
      select: { publishedAt: true },
    }),
    prisma.member.findMany({
      where: { createdAt: { gte: recentStart } },
      select: { createdAt: true },
    }),
    prisma.userQuestion.findMany({
      where: { createdAt: { gte: recentStart } },
      select: { createdAt: true },
    }),
  ]);

  const contentByTab = CONTENT_TAB_DEFS.map((tab) => ({ key: tab.key, label: tab.label, count: 0 }));
  const tabCountMap = new Map<ContentTabKey, number>(contentByTab.map((item) => [item.key, 0]));

  for (const article of approvedArticleRows) {
    const key = resolveTabKeyFromHref(article.categoryHref, article.subHref);
    tabCountMap.set(key, (tabCountMap.get(key) ?? 0) + 1);
  }

  const topArticles = approvedArticleRows.slice(0, 8).map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    viewCount: article.viewCount,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    tabKey: resolveTabKeyFromHref(article.categoryHref, article.subHref),
  }));

  const trendMap = new Map(
    recentBuckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, publishedArticles: 0, newMembers: 0, newQuestions: 0 },
    ])
  );

  for (const row of recentPublishedArticles) {
    if (!row.publishedAt) continue;
    const key = formatDayKey(row.publishedAt);
    const hit = trendMap.get(key);
    if (hit) hit.publishedArticles += 1;
  }
  for (const row of recentMembers) {
    const key = formatDayKey(row.createdAt);
    const hit = trendMap.get(key);
    if (hit) hit.newMembers += 1;
  }
  for (const row of recentQuestions) {
    const key = formatDayKey(row.createdAt);
    const hit = trendMap.get(key);
    if (hit) hit.newQuestions += 1;
  }

  return NextResponse.json({
    overview: {
      totalMembers,
      todayMembers,
      enterpriseMembers,
      totalEnterprises,
      approvedArticles,
      draftArticles,
      pendingArticles,
      rejectedArticles,
      totalViews: articleViewAggregate._sum.viewCount ?? 0,
      averageViewsPerArticle: Math.round(articleViewAggregate._avg.viewCount ?? 0),
      totalQuestions,
      answeredQuestions,
    },
    review: {
      pendingArticles,
      pendingChanges,
      pendingEnterpriseVerifications,
      pendingGallery,
      pendingStandardFeedback,
      totalPending:
        pendingArticles + pendingChanges + pendingEnterpriseVerifications + pendingGallery + pendingStandardFeedback,
    },
    contentByTab: contentByTab
      .map((item) => ({ ...item, count: tabCountMap.get(item.key) ?? 0 }))
      .sort((a, b) => b.count - a.count),
    topArticles,
    recentTrend: recentBuckets.map((bucket) => ({
      day: bucket.label,
      ...trendMap.get(bucket.key),
    })),
  });
}
