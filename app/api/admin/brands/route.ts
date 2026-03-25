import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
    const parsed = parseInt(value.trim(), 10);
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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;
  const q = searchParams.get("q")?.trim() ?? "";
  const recommend = searchParams.get("recommend");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { tagline: { contains: q } },
      { region: { contains: q } },
      { area: { contains: q } },
      { enterprise: { companyName: { contains: q } } },
      { enterprise: { companyShortName: { contains: q } } },
    ];
  }
  if (recommend === "1" || recommend === "0") {
    where.isRecommend = recommend === "1";
  }

  const [items, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      orderBy: [{ isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
      skip,
      take: limit,
      include: {
        enterprise: {
          select: {
            id: true,
            companyName: true,
            companyShortName: true,
            memberId: true,
            member: {
              select: {
                memberType: true,
                rankingWeight: true,
              },
            },
          },
        },
      },
    }),
    prisma.brand.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    slug,
    enterpriseId,
    logoUrl,
    tagline,
    region,
    area,
    positioning,
    materialSystem,
    productStructure,
    priceRange,
    targetAudience,
    businessModel,
    contactUrl,
    certUrl,
    isRecommend,
    isBrandVisible,
    sortOrder,
    rankingWeight,
    displayTemplate,
    memberTypeSnapshot,
  } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "品牌名称必填" }, { status: 400 });
  }

  try {
    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        slug: asTrimmedString(slug) ?? slugifyBrandName(name),
        enterpriseId: asTrimmedString(enterpriseId),
        logoUrl: asTrimmedString(logoUrl),
        tagline: asTrimmedString(tagline),
        region: asTrimmedString(region),
        area: asTrimmedString(area),
        positioning: asTrimmedString(positioning),
        materialSystem: asTrimmedString(materialSystem),
        productStructure: asTrimmedString(productStructure),
        priceRange: asTrimmedString(priceRange),
        targetAudience: asTrimmedString(targetAudience),
        businessModel: asTrimmedString(businessModel),
        contactUrl: asTrimmedString(contactUrl),
        certUrl: asTrimmedString(certUrl),
        isRecommend: parseBoolean(isRecommend, false),
        isBrandVisible: parseBoolean(isBrandVisible, true),
        sortOrder: parseInteger(sortOrder, 0),
        rankingWeight: parseInteger(rankingWeight, 0),
        displayTemplate: asTrimmedString(displayTemplate),
        memberTypeSnapshot: asTrimmedString(memberTypeSnapshot),
      },
      include: {
        enterprise: {
          select: {
            id: true,
            companyName: true,
            companyShortName: true,
            memberId: true,
            member: {
              select: {
                memberType: true,
                rankingWeight: true,
              },
            },
          },
        },
      },
    });
    return NextResponse.json(brand);
  } catch (e) {
    console.error("POST /api/admin/brands", e);
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "发布失败，请稍后重试";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
