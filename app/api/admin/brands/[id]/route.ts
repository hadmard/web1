import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { containsSuspiciousText, htmlToPlainText, normalizePlainTextField } from "@/lib/brand-content";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() || null : undefined;
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
      companyName: true,
      companyShortName: true,
      memberId: true,
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: adminBrandInclude,
  });

  if (!brand) {
    return NextResponse.json({ error: "品牌不存在" }, { status: 404 });
  }

  const displayName = brand.enterprise?.companyShortName || brand.enterprise?.companyName || brand.name;
  const displayLogo = brand.enterprise?.logoUrl || brand.logoUrl || null;
  const displayRegion = brand.enterprise?.region || brand.region || "全国";
  const displayArea = brand.enterprise?.area || brand.area || null;
  const summarySource = brand.enterprise?.positioning || brand.enterprise?.intro || brand.tagline || brand.positioning || null;

  return NextResponse.json({
    ...brand,
    frontDisplay: {
      name: displayName,
      logoUrl: displayLogo,
      region: displayRegion,
      area: displayArea,
      summary: normalizePlainTextField(summarySource) ?? "",
      detailHref: brand.enterprise ? `/enterprise/${brand.enterprise.id}` : `/brands/${brand.slug}`,
    },
    qualityFlags: getBrandQualityFlags({
      brandLogoUrl: brand.logoUrl,
      enterpriseLogoUrl: brand.enterprise?.logoUrl ?? null,
      summarySource,
      contactPhone: brand.enterprise?.contactPhone ?? null,
      website: brand.enterprise?.website ?? null,
      contactInfo: brand.enterprise?.contactInfo ?? null,
    }),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data: Record<string, string | number | boolean | null | undefined> = {};

  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.slug !== undefined) data.slug = trimString(body.slug) ?? undefined;
  if (body.enterpriseId !== undefined) data.enterpriseId = trimString(body.enterpriseId);
  if (body.logoUrl !== undefined) data.logoUrl = trimString(body.logoUrl);
  if (body.tagline !== undefined) data.tagline = normalizePlainTextField(body.tagline) ?? undefined;
  if (body.region !== undefined) data.region = normalizePlainTextField(body.region) ?? undefined;
  if (body.area !== undefined) data.area = normalizePlainTextField(body.area) ?? undefined;
  if (body.positioning !== undefined) data.positioning = normalizePlainTextField(body.positioning) ?? undefined;
  if (body.materialSystem !== undefined) data.materialSystem = normalizePlainTextField(body.materialSystem) ?? undefined;
  if (body.productStructure !== undefined) data.productStructure = normalizePlainTextField(body.productStructure) ?? undefined;
  if (body.priceRange !== undefined) data.priceRange = normalizePlainTextField(body.priceRange) ?? undefined;
  if (body.targetAudience !== undefined) data.targetAudience = normalizePlainTextField(body.targetAudience) ?? undefined;
  if (body.businessModel !== undefined) data.businessModel = normalizePlainTextField(body.businessModel) ?? undefined;
  if (body.contactUrl !== undefined) data.contactUrl = trimString(body.contactUrl) ?? undefined;
  if (body.certUrl !== undefined) data.certUrl = trimString(body.certUrl) ?? undefined;
  if (body.isRecommend !== undefined) data.isRecommend = parseBoolean(body.isRecommend);
  if (body.isBrandVisible !== undefined) data.isBrandVisible = parseBoolean(body.isBrandVisible);
  if (body.sortOrder !== undefined) data.sortOrder = parseInteger(body.sortOrder);
  if (body.rankingWeight !== undefined) data.rankingWeight = parseInteger(body.rankingWeight);
  if (body.displayTemplate !== undefined) data.displayTemplate = trimString(body.displayTemplate);
  if (body.memberTypeSnapshot !== undefined) data.memberTypeSnapshot = trimString(body.memberTypeSnapshot);

  const updates = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: updates,
    include: adminBrandInclude,
  });

  revalidateBrandPaths(brand.enterprise?.id, brand.slug);
  return NextResponse.json(brand);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.brand.findUnique({
    where: { id },
    select: {
      slug: true,
      enterpriseId: true,
    },
  });

  await prisma.brand.delete({ where: { id } });
  revalidateBrandPaths(existing?.enterpriseId, existing?.slug);
  return NextResponse.json({ ok: true });
}
