import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
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

  const [items, total] = await Promise.all([
    prisma.brand.findMany({ orderBy: { updatedAt: "desc" }, skip, take: limit }),
    prisma.brand.count(),
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
    positioning,
    materialSystem,
    productStructure,
    priceRange,
    targetAudience,
    businessModel,
    contactUrl,
    certUrl,
  } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "品牌名称必填" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
  try {
    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        positioning: str(positioning),
        materialSystem: str(materialSystem),
        productStructure: str(productStructure),
        priceRange: str(priceRange),
        targetAudience: str(targetAudience),
        businessModel: str(businessModel),
        contactUrl: str(contactUrl),
        certUrl: str(certUrl),
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
