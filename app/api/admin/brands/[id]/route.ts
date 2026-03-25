import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
    const parsed = parseInt(value.trim(), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : undefined);
  const data: {
    name?: string;
    slug?: string;
    enterpriseId?: string | null;
    logoUrl?: string | null;
    tagline?: string | null;
    region?: string | null;
    area?: string | null;
    positioning?: string | null;
    materialSystem?: string | null;
    productStructure?: string | null;
    priceRange?: string | null;
    targetAudience?: string | null;
    businessModel?: string | null;
    contactUrl?: string | null;
    certUrl?: string | null;
    isRecommend?: boolean;
    isBrandVisible?: boolean;
    sortOrder?: number;
    rankingWeight?: number;
    displayTemplate?: string | null;
    memberTypeSnapshot?: string | null;
  } = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.slug !== undefined) data.slug = str(body.slug) ?? undefined;
  if (body.enterpriseId !== undefined) data.enterpriseId = str(body.enterpriseId);
  if (body.logoUrl !== undefined) data.logoUrl = str(body.logoUrl);
  if (body.tagline !== undefined) data.tagline = str(body.tagline);
  if (body.region !== undefined) data.region = str(body.region);
  if (body.area !== undefined) data.area = str(body.area);
  if (body.positioning !== undefined) data.positioning = str(body.positioning) ?? undefined;
  if (body.materialSystem !== undefined) data.materialSystem = str(body.materialSystem) ?? undefined;
  if (body.productStructure !== undefined) data.productStructure = str(body.productStructure) ?? undefined;
  if (body.priceRange !== undefined) data.priceRange = str(body.priceRange) ?? undefined;
  if (body.targetAudience !== undefined) data.targetAudience = str(body.targetAudience) ?? undefined;
  if (body.businessModel !== undefined) data.businessModel = str(body.businessModel) ?? undefined;
  if (body.contactUrl !== undefined) data.contactUrl = str(body.contactUrl) ?? undefined;
  if (body.certUrl !== undefined) data.certUrl = str(body.certUrl) ?? undefined;
  if (body.isRecommend !== undefined) data.isRecommend = parseBoolean(body.isRecommend);
  if (body.isBrandVisible !== undefined) data.isBrandVisible = parseBoolean(body.isBrandVisible);
  if (body.sortOrder !== undefined) data.sortOrder = parseInteger(body.sortOrder);
  if (body.rankingWeight !== undefined) data.rankingWeight = parseInteger(body.rankingWeight);
  if (body.displayTemplate !== undefined) data.displayTemplate = str(body.displayTemplate);
  if (body.memberTypeSnapshot !== undefined) data.memberTypeSnapshot = str(body.memberTypeSnapshot);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const brand = await prisma.brand.update({
    where: { id },
    data,
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
