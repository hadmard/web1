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
    title?: string;
    slug?: string;
    definition?: string;
    background?: string | null;
    features?: string | null;
    structure?: string | null;
    significance?: string | null;
    version?: string | null;
  } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.slug === "string") {
    const s = body.slug.trim();
    if (s) {
      const existing = await prisma.term.findFirst({ where: { slug: s, NOT: { id } } });
      if (existing) return NextResponse.json({ error: "该 slug 已存在" }, { status: 400 });
      data.slug = s;
    }
  }
  if (typeof body.definition === "string") data.definition = body.definition;
  if (body.background !== undefined) data.background = str(body.background) ?? undefined;
  if (body.features !== undefined) data.features = str(body.features) ?? undefined;
  if (body.structure !== undefined) data.structure = str(body.structure) ?? undefined;
  if (body.significance !== undefined) data.significance = str(body.significance) ?? undefined;
  if (body.version !== undefined) data.version = str(body.version) ?? undefined;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const term = await prisma.term.update({ where: { id }, data });
  return NextResponse.json(term);
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
  await prisma.term.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
