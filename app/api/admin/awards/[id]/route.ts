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
  const data: {
    title?: string;
    slug?: string;
    year?: number | null;
    description?: string | null;
    coverImage?: string | null;
    linkUrl?: string | null;
  } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.slug === "string") {
    const s = body.slug.trim();
    if (s) {
      const existing = await prisma.award.findFirst({ where: { slug: s, NOT: { id } } });
      if (existing) return NextResponse.json({ error: "该 slug 已存在" }, { status: 400 });
      data.slug = s;
    }
  }
  if (body.year !== undefined) {
    const y = typeof body.year === "number" ? body.year : parseInt(String(body.year), 10);
    data.year = Number.isNaN(y) ? null : y;
  }
  if (body.description !== undefined) data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  if (body.coverImage !== undefined) data.coverImage = typeof body.coverImage === "string" ? body.coverImage.trim() || null : null;
  if (body.linkUrl !== undefined) data.linkUrl = typeof body.linkUrl === "string" ? body.linkUrl.trim() || null : null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const award = await prisma.award.update({ where: { id }, data });
  return NextResponse.json(award);
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
  await prisma.award.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
