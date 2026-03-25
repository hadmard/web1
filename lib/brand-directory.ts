import { containsSuspiciousText, htmlToPlainText, normalizePlainTextField, toSummaryText } from "./brand-content";
import { prisma } from "./prisma";

const brandCardSelect = {
  id: true,
  slug: true,
  name: true,
  logoUrl: true,
  tagline: true,
  region: true,
  area: true,
  positioning: true,
  isRecommend: true,
  isBrandVisible: true,
  sortOrder: true,
  rankingWeight: true,
  displayTemplate: true,
  memberTypeSnapshot: true,
  updatedAt: true,
  createdAt: true,
  enterprise: {
    select: {
      id: true,
      memberId: true,
      companyName: true,
      companyShortName: true,
      intro: true,
      logoUrl: true,
      region: true,
      area: true,
      positioning: true,
      productSystem: true,
      craftLevel: true,
      certifications: true,
      awards: true,
      contactPhone: true,
      contactInfo: true,
      website: true,
      address: true,
      updatedAt: true,
      member: {
        select: {
          id: true,
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  },
} as const;

export type BrandDirectoryFilters = {
  q?: string;
  region?: string;
  onlyRecommended?: boolean;
  page?: number;
  pageSize?: number;
};

type BrandRecord = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  region: string | null;
  area: string | null;
  positioning: string | null;
  isRecommend: boolean;
  isBrandVisible: boolean;
  sortOrder: number;
  rankingWeight: number;
  displayTemplate: string | null;
  memberTypeSnapshot: string | null;
  updatedAt: Date;
  createdAt: Date;
  enterprise: {
    id: string;
    memberId: string;
    companyName: string | null;
    companyShortName: string | null;
    intro: string | null;
    logoUrl: string | null;
    region: string | null;
    area: string | null;
    positioning: string | null;
    productSystem: string | null;
    craftLevel: string | null;
    certifications: string | null;
    awards: string | null;
    contactPhone: string | null;
    contactInfo: string | null;
    website: string | null;
    address: string | null;
    updatedAt: Date;
    member: {
      id: string;
      memberType: string;
      rankingWeight: number;
    } | null;
  } | null;
};

function buildBrandWhere(filters: BrandDirectoryFilters = {}) {
  const q = filters.q?.trim();
  const region = filters.region?.trim();

  return {
    isBrandVisible: true,
    ...(filters.onlyRecommended ? { isRecommend: true } : {}),
    ...(region
      ? {
          OR: [
            { region: { contains: region } },
            { area: { contains: region } },
            { enterprise: { region: { contains: region } } },
            { enterprise: { area: { contains: region } } },
          ],
        }
      : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q } },
                { tagline: { contains: q } },
                { positioning: { contains: q } },
                { region: { contains: q } },
                { area: { contains: q } },
                { enterprise: { companyName: { contains: q } } },
                { enterprise: { companyShortName: { contains: q } } },
                { enterprise: { intro: { contains: q } } },
                { enterprise: { productSystem: { contains: q } } },
              ],
            },
          ],
        }
      : {}),
  };
}

function cleanDisplayField(value: string | null | undefined) {
  const text = normalizePlainTextField(value);
  if (!text) return null;
  return containsSuspiciousText(text) ? null : text;
}

function pickSummarySource(record: BrandRecord) {
  return (
    record.enterprise?.positioning ||
    record.enterprise?.intro ||
    record.tagline ||
    record.positioning ||
    "企业资料完善后，这里会展示品牌定位、服务能力与核心亮点。"
  );
}

function buildHighlightTokens(record: BrandRecord, region: string, area: string | null) {
  return [
    cleanDisplayField(record.enterprise?.productSystem),
    cleanDisplayField(record.enterprise?.craftLevel),
    area,
    region,
    cleanDisplayField(record.enterprise?.awards),
  ].filter(Boolean).slice(0, 4) as string[];
}

function buildContactHref(phone: string | null, website: string | null) {
  if (phone) return `tel:${phone.replace(/[^\d+]/g, "")}`;
  if (website && /^https?:\/\//i.test(website)) return website;
  return null;
}

function buildContactLabel(phone: string | null, website: string | null, contactInfo: string | null) {
  if (phone) return "立即致电";
  if (website) return "访问官网";
  if (contactInfo) return "联系品牌";
  return "查看详情";
}

function normalizeBrand(record: BrandRecord) {
  const enterprise = record.enterprise;
  const memberType = record.memberTypeSnapshot || enterprise?.member?.memberType || "enterprise_basic";
  const enterpriseName = cleanDisplayField(enterprise?.companyShortName || enterprise?.companyName || record.name) || record.name;
  const region = cleanDisplayField(enterprise?.region || record.region) || "全国";
  const area = cleanDisplayField(enterprise?.area || record.area);
  const rawSummary = pickSummarySource(record);
  const summary = toSummaryText(rawSummary, 120);
  const safeSummary = containsSuspiciousText(summary)
    ? "品牌资料正在整理中，当前可先查看企业详情、联系方式和服务能力。"
    : summary;
  const contactPhone = cleanDisplayField(enterprise?.contactPhone);
  const contactInfo = cleanDisplayField(enterprise?.contactInfo);
  const website = cleanDisplayField(enterprise?.website);
  const headline = cleanDisplayField(enterprise?.positioning || record.tagline) || safeSummary;
  const highlights = buildHighlightTokens(record, region, area);

  return {
    ...record,
    enterprise,
    memberType,
    enterpriseName,
    logoUrl: enterprise?.logoUrl || record.logoUrl || null,
    region,
    area,
    summary: safeSummary,
    headline,
    highlights,
    summaryPlain: htmlToPlainText(rawSummary),
    summaryRichText: enterprise?.intro || record.positioning || record.tagline || null,
    contactPhone,
    contactInfo,
    website,
    contactHref: buildContactHref(contactPhone, website),
    contactLabel: buildContactLabel(contactPhone, website, contactInfo),
    locationLabel: [region, area].filter(Boolean).join(" / "),
    serviceLine: cleanDisplayField(enterprise?.productSystem || enterprise?.craftLevel) || "整木定制 / 品牌展示",
    displayTemplate: record.displayTemplate || "brand_showcase",
    updatedAt: enterprise?.updatedAt && enterprise.updatedAt > record.updatedAt ? enterprise.updatedAt : record.updatedAt,
  };
}

export async function getBrandDirectoryBySlug(slug: string) {
  const record = await prisma.brand.findUnique({
    where: { slug },
    select: brandCardSelect,
  });

  return record ? normalizeBrand(record) : null;
}

export async function getVisibleBrandSlugs() {
  return prisma.brand.findMany({
    where: { isBrandVisible: true },
    select: { slug: true },
  });
}

export async function getBrandDirectoryList(limit = 10) {
  const rows = await prisma.brand.findMany({
    where: { isBrandVisible: true },
    orderBy: [{ isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: brandCardSelect,
  });

  return rows.map(normalizeBrand);
}

export async function getBrandDirectory(filters: BrandDirectoryFilters = {}) {
  const pageSize = Math.max(1, filters.pageSize ?? 18);
  const page = Math.max(1, filters.page ?? 1);
  const where = buildBrandWhere(filters);

  const [recommendedRows, total, rows] = await Promise.all([
    prisma.brand.findMany({
      where: buildBrandWhere({ ...filters, onlyRecommended: true }),
      orderBy: [{ sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: brandCardSelect,
    }),
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      orderBy: [{ isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: brandCardSelect,
    }),
  ]);

  const recommended = recommendedRows.map(normalizeBrand);
  const items = rows.map(normalizeBrand);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    total,
    totalPages,
    page: Math.min(page, totalPages),
    pageSize,
    recommended,
    items,
  };
}
