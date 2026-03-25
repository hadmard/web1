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
      awards: true,
      contactPhone: true,
      website: true,
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

function normalizeBrand(record: {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  region: string | null;
  area: string | null;
  positioning: string | null;
  isRecommend: boolean;
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
    awards: string | null;
    contactPhone: string | null;
    website: string | null;
    updatedAt: Date;
    member: {
      id: string;
      memberType: string;
      rankingWeight: number;
    } | null;
  } | null;
}) {
  const enterprise = record.enterprise;
  const memberType = record.memberTypeSnapshot || enterprise?.member?.memberType || "enterprise_basic";

  return {
    ...record,
    enterprise,
    memberType,
    enterpriseName: enterprise?.companyShortName || enterprise?.companyName || record.name,
    logoUrl: record.logoUrl || enterprise?.logoUrl || null,
    region: record.region || enterprise?.region || "全国",
    area: record.area || enterprise?.area || null,
    summary:
      record.tagline ||
      enterprise?.positioning ||
      record.positioning ||
      enterprise?.intro ||
      "企业资料完善后，将在这里展示品牌亮点。",
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
