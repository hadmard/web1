import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
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
    positioning?: string | null;
    materialSystem?: string | null;
    productStructure?: string | null;
    priceRange?: string | null;
    targetAudience?: string | null;
    businessModel?: string | null;
    contactUrl?: string | null;
    certUrl?: string | null;
  } = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.positioning !== undefined) data.positioning = str(body.positioning) ?? undefined;
  if (body.materialSystem !== undefined) data.materialSystem = str(body.materialSystem) ?? undefined;
  if (body.productStructure !== undefined) data.productStructure = str(body.productStructure) ?? undefined;
  if (body.priceRange !== undefined) data.priceRange = str(body.priceRange) ?? undefined;
  if (body.targetAudience !== undefined) data.targetAudience = str(body.targetAudience) ?? undefined;
  if (body.businessModel !== undefined) data.businessModel = str(body.businessModel) ?? undefined;
  if (body.contactUrl !== undefined) data.contactUrl = str(body.contactUrl) ?? undefined;
  if (body.certUrl !== undefined) data.certUrl = str(body.certUrl) ?? undefined;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const brand = await prisma.brand.update({ where: { id }, data });
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
