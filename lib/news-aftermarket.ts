import { prisma } from "@/lib/prisma";
import { APP_SETTING_KEYS } from "@/lib/app-settings";
import { YOUXUAN_H5_URL } from "@/lib/youxuan";

export const NEWS_AFTERMARKET_SUBCATEGORY = {
  href: "/news/aftermarket",
  slug: "aftermarket",
  label: "整木后市场",
  shortLabel: "后市场",
  description: "聚焦木制品清洁、养护、保养与进口护理产品推荐的整木资讯栏目。",
  intro: "围绕木门、木饰面、柜体、护墙板与木家具等木作场景，持续发布清洁养护建议、进口护理产品推荐与售后维护内容。",
} as const;

export type ArticleProductRecommendation = {
  title: string;
  url: string;
  imageUrl?: string;
  sellingPoint?: string;
};

export type NewsAftermarketConfig = {
  generateAt: string;
  dailyGenerateCount: number;
  homeDisplayCount: number;
  detailRecommendCount: number;
  seoKeywordTemplate: string[];
  promptTemplate: string;
  defaultProductPool: ArticleProductRecommendation[];
};

const DEFAULT_PRODUCT_POOL: ArticleProductRecommendation[] = [
  {
    title: "WOCA 木作清洁养护产品",
    url: "/product/981746066",
    sellingPoint: "进口木作护理方向，可用于木门、木饰面与高端木作日常维护。",
  },
  {
    title: "整木优选护理频道",
    url: `${YOUXUAN_H5_URL}category/care`,
    sellingPoint: "聚焦木作清洁保养与交付维护场景，适合继续浏览护理类商品。",
  },
];

export const DEFAULT_NEWS_AFTERMARKET_CONFIG: NewsAftermarketConfig = {
  generateAt: "07:30",
  dailyGenerateCount: 1,
  homeDisplayCount: 4,
  detailRecommendCount: 3,
  seoKeywordTemplate: [
    "整木后市场",
    "木制品清洁",
    "木作养护",
    "进口木作护理产品",
    "高端木作保养",
  ],
  promptTemplate:
    "围绕木制品清洁、养护、保养主题，撰写适合整木行业网站发布的中文优化推广文章。文章要兼顾搜索优化和产品推广，面向关注木门、木饰面、柜体、护墙板、木家具等木作护理的人群。内容需自然融入国外原装进口、且有库存的木制品清洁养护产品优势，语气专业、可信、实用，不夸大、不虚构，避免空泛和明显机器感。文章结构清晰，标题具备 SEO 属性，正文包含场景问题、护理建议、产品解决方案与购买引导，适合发布到整木资讯栏目下的‘整木后市场’。",
  defaultProductPool: DEFAULT_PRODUCT_POOL,
};

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/product/")) return trimmed;
  if (trimmed.startsWith("/youxuan")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
}

function normalizeTextField(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function normalizeProductRecommendations(input: unknown): ArticleProductRecommendation[] {
  if (!Array.isArray(input)) return [];

  const normalized = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = normalizeTextField(row.title, 80);
      const url = normalizeUrl(row.url);
      const imageUrl = normalizeTextField(row.imageUrl, 500);
      const sellingPoint = normalizeTextField(row.sellingPoint, 120);
      if (!title || !url) return null;
      const next: ArticleProductRecommendation = {
        title,
        url,
        imageUrl: imageUrl || undefined,
        sellingPoint: sellingPoint || undefined,
      };
      return next;
    })
    .filter((item): item is ArticleProductRecommendation => item !== null);

  return normalized.slice(0, 3);
}

export function parseProductRecommendations(input?: string | null) {
  if (!input) return [] as ArticleProductRecommendation[];
  try {
    return normalizeProductRecommendations(JSON.parse(input));
  } catch {
    return [];
  }
}

export function stringifyProductRecommendations(input: unknown) {
  const normalized = normalizeProductRecommendations(input);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

function normalizeConfig(input: unknown): NewsAftermarketConfig {
  if (!input || typeof input !== "object") return DEFAULT_NEWS_AFTERMARKET_CONFIG;
  const row = input as Record<string, unknown>;
  const generateAt =
    typeof row.generateAt === "string" && /^\d{2}:\d{2}$/.test(row.generateAt.trim())
      ? row.generateAt.trim()
      : DEFAULT_NEWS_AFTERMARKET_CONFIG.generateAt;
  const dailyGenerateCount = Math.max(
    1,
    Math.min(
      3,
      typeof row.dailyGenerateCount === "number"
        ? Math.trunc(row.dailyGenerateCount)
        : DEFAULT_NEWS_AFTERMARKET_CONFIG.dailyGenerateCount,
    ),
  );
  const homeDisplayCount = Math.max(
    3,
    Math.min(
      5,
      typeof row.homeDisplayCount === "number"
        ? Math.trunc(row.homeDisplayCount)
        : DEFAULT_NEWS_AFTERMARKET_CONFIG.homeDisplayCount,
    ),
  );
  const detailRecommendCount = Math.max(
    1,
    Math.min(
      3,
      typeof row.detailRecommendCount === "number"
        ? Math.trunc(row.detailRecommendCount)
        : DEFAULT_NEWS_AFTERMARKET_CONFIG.detailRecommendCount,
    ),
  );
  const seoKeywordTemplate =
    Array.isArray(row.seoKeywordTemplate) && row.seoKeywordTemplate.length > 0
      ? row.seoKeywordTemplate
          .map((item) => normalizeTextField(item, 40))
          .filter(Boolean)
          .slice(0, 8)
      : DEFAULT_NEWS_AFTERMARKET_CONFIG.seoKeywordTemplate;
  const promptTemplate =
    normalizeTextField(row.promptTemplate, 1000) || DEFAULT_NEWS_AFTERMARKET_CONFIG.promptTemplate;
  const defaultProductPool =
    normalizeProductRecommendations(row.defaultProductPool).length > 0
      ? normalizeProductRecommendations(row.defaultProductPool)
      : DEFAULT_NEWS_AFTERMARKET_CONFIG.defaultProductPool;

  return {
    generateAt,
    dailyGenerateCount,
    homeDisplayCount,
    detailRecommendCount,
    seoKeywordTemplate,
    promptTemplate,
    defaultProductPool,
  };
}

export async function getNewsAftermarketConfig() {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEYS.NEWS_AFTERMARKET_CONFIG },
  });

  if (!row?.value) return DEFAULT_NEWS_AFTERMARKET_CONFIG;

  try {
    return normalizeConfig(JSON.parse(row.value));
  } catch {
    return DEFAULT_NEWS_AFTERMARKET_CONFIG;
  }
}
