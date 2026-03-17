import { articleOrderByPinnedLatest, articleOrderByPinnedPopular } from "@/lib/articles";
import { ENGINEER_CATEGORY_LABELS, getLatestHuadianYear, getTop10ByYear } from "@/lib/huadianbang";
import { prisma } from "@/lib/prisma";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";

const REGION_ORDER = ["华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;

function isReadableLabel(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (t.includes("?")) return false;
  if (/^[BTSDW]-\d{14}$/.test(t)) return false;
  return true;
}

export type HomepageLinkItem = {
  label: string;
  href: string;
};

export type HomepageStructureCard = {
  title: string;
  subtitle: string;
  desc: string;
  href: string;
  image: string;
  items: HomepageLinkItem[];
};

export type HomepageRegionCount = {
  region: string;
  count: number;
};

export async function getHomepageData() {
  const [
    visualSettings,
    latestNews,
    hotNews,
    latestBrands,
    latestTerms,
    latestStandards,
    latestAwards,
    enterprises,
  ] = await Promise.all([
    getSiteVisualSettings(),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
      orderBy: articleOrderByPinnedLatest,
      take: 6,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
      orderBy: articleOrderByPinnedPopular,
      take: 6,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }] },
      orderBy: articleOrderByPinnedLatest,
      take: 8,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }] },
      orderBy: articleOrderByPinnedLatest,
      take: 8,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }] },
      orderBy: articleOrderByPinnedLatest,
      take: 8,
      select: { id: true, title: true, slug: true, versionLabel: true },
    }),
    prisma.award.findMany({
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true, year: true },
    }),
    prisma.enterprise.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        region: true,
        area: true,
        member: { select: { name: true, memberType: true } },
      },
    }),
  ]);

  const regionMap = new Map<string, number>();
  REGION_ORDER.forEach((region) => regionMap.set(region, 0));
  enterprises.forEach((enterprise) => {
    const region = (enterprise.region || "").trim();
    if (regionMap.has(region)) {
      regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    }
  });

  const safeBrands = latestBrands.filter((item) => isReadableLabel(item.title));
  const safeTerms = latestTerms.filter((item) => isReadableLabel(item.title));
  const safeStandards = latestStandards.filter((item) => isReadableLabel(item.title));
  const safeAwards = latestAwards.filter((item) => isReadableLabel(item.title));
  const huadianYear = getLatestHuadianYear();

  const structureCards: HomepageStructureCard[] = [
    {
      title: "整木市场",
      subtitle: "品牌选择与选购问答",
      desc: "覆盖整木品牌与整木选购 FAQ，快速完成品牌对比与决策。",
      href: "/brands/all",
      image: visualSettings.backgrounds.homeStructureMarket,
      items: safeBrands.map((item) => ({ label: item.title, href: `/brands/${item.slug}` })),
    },
    {
      title: "整木词库",
      subtitle: "术语与知识结构",
      desc: "沉淀概念定义、工艺术语与行业释义，形成统一表达。",
      href: "/dictionary/all",
      image: visualSettings.backgrounds.homeStructureDictionary,
      items: [
        { label: "品牌百科", href: "/dictionary/brand-baike" },
        { label: "高定生活", href: "/dictionary/high-end-life" },
        ...safeTerms.map((item) => ({ label: item.title, href: `/dictionary/${item.slug}` })),
      ],
    },
    {
      title: "整木标准",
      subtitle: "材料 / 工艺 / 服务",
      desc: "以结构化标准体系支撑落地执行与跨团队协作。",
      href: "/standards/all",
      image: visualSettings.backgrounds.homeStructureStandards,
      items: safeStandards.map((item) => ({
        label: `${item.versionLabel ? `${item.versionLabel} · ` : ""}${item.title}`,
        href: `/standards/${item.slug || item.id}`,
      })),
    },
    {
      title: "整木评选",
      subtitle: "规则透明、流程可追溯",
      desc: "以公开规则、评审机制和公示流程建立行业公信力。",
      href: "/awards",
      image: visualSettings.backgrounds.homeStructureAwards,
      items: safeAwards.map((item) => ({
        label: `${item.year ? `${item.year} · ` : ""}${item.title}`,
        href: `/awards/${item.slug || item.id}`,
      })),
    },
  ];

  return {
    visualSettings,
    latestNews,
    hotNews,
    structureCards,
    middleAd: visualSettings.ads.homeMiddle,
    enterprises,
    regionCounts: REGION_ORDER.map((region) => ({ region, count: regionMap.get(region) ?? 0 })),
    huadianYear,
    huadianTop10: getTop10ByYear(huadianYear),
    huadianPartner: Object.values(ENGINEER_CATEGORY_LABELS).slice(0, 3),
  };
}
