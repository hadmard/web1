import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { containsSuspiciousText, htmlToPlainText, normalizePlainTextField, toSummaryText } from "@/lib/brand-content";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function parseInteger(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function slugifyBrandName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `brand-${Date.now()}`;
}

function revalidateBrandPaths(enterpriseId: string | null | undefined, slug: string | null | undefined) {
  revalidatePath("/brands");
  revalidatePath("/brands/all");
  if (enterpriseId) revalidatePath(`/enterprise/${enterpriseId}`);
  if (slug) revalidatePath(`/brands/${slug}`);
}

function getBrandQualityFlags(input: {
  brandLogoUrl: string | null;
  enterpriseLogoUrl: string | null;
  summarySource: string | null;
  contactPhone: string | null;
  website: string | null;
  contactInfo: string | null;
}) {
  const summaryText = htmlToPlainText(input.summarySource);
  return {
    missingLogo: !(input.enterpriseLogoUrl || input.brandLogoUrl),
    missingSummary: !summaryText,
    missingContact: !(input.contactPhone || input.website || input.contactInfo),
    weakIntro: summaryText.length > 0 && summaryText.length < 36,
    suspiciousIntro: containsSuspiciousText(input.summarySource),
  };
}

const adminBrandInclude = {
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
      contactPerson: true,
      contactPhone: true,
      contactInfo: true,
      website: true,
      address: true,
      productSystem: true,
      craftLevel: true,
      certifications: true,
      awards: true,
      member: {
        select: {
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(500, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;
  const q = searchParams.get("q")?.trim() ?? "";
  const recommend = searchParams.get("recommend");
  const quality = searchParams.get("quality");
  const requiresPostFilter = quality === "intro_short" || quality === "intro_dirty";
  const querySkip = requiresPostFilter ? 0 : skip;
  const queryTake = requiresPostFilter ? 500 : limit;

  const conditions: Record<string, unknown>[] = [];
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
        { tagline: { contains: q } },
        { region: { contains: q } },
        { area: { contains: q } },
        { enterprise: { companyName: { contains: q } } },
        { enterprise: { companyShortName: { contains: q } } },
        { enterprise: { intro: { contains: q } } },
        { enterprise: { positioning: { contains: q } } },
        { enterprise: { productSystem: { contains: q } } },
      ],
    });
  }
  if (recommend === "1" || recommend === "0") {
    conditions.push({ isRecommend: recommend === "1" });
  }
  if (quality === "needs_attention") {
    conditions.push({
      OR: [
        { logoUrl: null },
        { enterprise: { logoUrl: null } },
        { tagline: null },
        { positioning: null },
        { enterprise: { positioning: null } },
        { enterprise: { intro: null } },
        { enterprise: { contactPhone: null } },
      ],
    });
  }
  if (quality === "missing_logo") {
    conditions.push({
      AND: [{ logoUrl: null }, { enterprise: { logoUrl: null } }],
    });
  }
  if (quality === "missing_summary") {
    conditions.push({
      AND: [{ tagline: null }, { positioning: null }, { enterprise: { positioning: null } }, { enterprise: { intro: null } }],
    });
  }
  if (quality === "missing_contact") {
    conditions.push({
      AND: [{ enterprise: { contactPhone: null } }, { enterprise: { website: null } }, { enterprise: { contactInfo: null } }],
    });
  }
  if (quality === "intro_short") {
    conditions.push({
      OR: [
        { enterprise: { positioning: { not: null } } },
        { enterprise: { intro: { not: null } } },
        { tagline: { not: null } },
        { positioning: { not: null } },
      ],
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const needsAttentionWhere = {
    OR: [
      { logoUrl: null },
      { enterprise: { logoUrl: null } },
      { tagline: null },
      { positioning: null },
      { enterprise: { positioning: null } },
      { enterprise: { intro: null } },
      { enterprise: { contactPhone: null } },
    ],
  };

  const [items, total, visibleTotal, recommendedTotal, needsAttentionTotal, totalBrands] = await Promise.all([
    prisma.brand.findMany({
      where,
      orderBy: [{ isBrandVisible: "desc" }, { isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
      skip: querySkip,
      take: queryTake,
      include: adminBrandInclude,
    }),
    prisma.brand.count({ where }),
    prisma.brand.count({ where: { isBrandVisible: true } }),
    prisma.brand.count({ where: { isBrandVisible: true, isRecommend: true } }),
    prisma.brand.count({ where: needsAttentionWhere }),
    prisma.brand.count(),
  ]);

  const normalized = items.map((item) => {
    const displayName = item.enterprise?.companyShortName || item.enterprise?.companyName || item.name;
    const displayLogo = item.enterprise?.logoUrl || item.logoUrl || null;
    const displayRegion = item.enterprise?.region || item.region || "全国";
    const displayArea = item.enterprise?.area || item.area || null;
    const summarySource = item.enterprise?.positioning || item.enterprise?.intro || item.tagline || item.positioning || null;

    return {
      ...item,
      frontDisplay: {
        name: displayName,
        logoUrl: displayLogo,
        region: displayRegion,
        area: displayArea,
        summary: toSummaryText(summarySource, 120),
        detailHref: item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`,
      },
      qualityFlags: getBrandQualityFlags({
        brandLogoUrl: item.logoUrl,
        enterpriseLogoUrl: item.enterprise?.logoUrl ?? null,
        summarySource,
        contactPhone: item.enterprise?.contactPhone ?? null,
        website: item.enterprise?.website ?? null,
        contactInfo: item.enterprise?.contactInfo ?? null,
      }),
    };
  }).filter((item) => {
    if (quality === "intro_short") return item.qualityFlags.weakIntro;
    if (quality === "intro_dirty") return item.qualityFlags.suspiciousIntro;
    return true;
  });

  const effectiveTotal = requiresPostFilter ? normalized.length : total;
  const pagedItems = requiresPostFilter ? normalized.slice(skip, skip + limit) : normalized;

  return NextResponse.json({
    items: pagedItems,
    total: effectiveTotal,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(effectiveTotal / limit)),
    stats: {
      totalBrands,
      visibleTotal,
      recommendedTotal,
      needsAttentionTotal,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "品牌名称必填" }, { status: 400 });
  }

  try {
    const brand = await prisma.brand.create({
      data: {
        name,
        slug: asTrimmedString(body.slug) ?? slugifyBrandName(name),
        enterpriseId: asTrimmedString(body.enterpriseId),
        logoUrl: asTrimmedString(body.logoUrl),
        tagline: normalizePlainTextField(body.tagline),
        region: normalizePlainTextField(body.region),
        area: normalizePlainTextField(body.area),
        positioning: normalizePlainTextField(body.positioning),
        materialSystem: normalizePlainTextField(body.materialSystem),
        productStructure: normalizePlainTextField(body.productStructure),
        priceRange: normalizePlainTextField(body.priceRange),
        targetAudience: normalizePlainTextField(body.targetAudience),
        businessModel: normalizePlainTextField(body.businessModel),
        contactUrl: asTrimmedString(body.contactUrl),
        certUrl: asTrimmedString(body.certUrl),
        isRecommend: parseBoolean(body.isRecommend, false),
        isBrandVisible: parseBoolean(body.isBrandVisible, true),
        sortOrder: parseInteger(body.sortOrder, 0),
        rankingWeight: parseInteger(body.rankingWeight, 0),
        displayTemplate: asTrimmedString(body.displayTemplate),
        memberTypeSnapshot: asTrimmedString(body.memberTypeSnapshot),
      },
      include: adminBrandInclude,
    });

    revalidateBrandPaths(brand.enterprise?.id, brand.slug);
    return NextResponse.json(brand);
  } catch (error) {
    console.error("POST /api/admin/brands", error);
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "品牌创建失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
