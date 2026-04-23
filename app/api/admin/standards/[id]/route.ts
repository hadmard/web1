import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeRichTextField } from "@/lib/brand-content";

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
  const data: { title?: string; code?: string; year?: number; content?: string | null; version?: string | null } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.code === "string") data.code = body.code.trim();
  if (typeof body.year === "number") data.year = body.year;
  else if (body.year != null) {
    const y = parseInt(String(body.year), 10);
    if (!Number.isNaN(y)) data.year = y;
  }
  if (body.content !== undefined) data.content = normalizeRichTextField(body.content);
  if (body.version !== undefined) data.version = typeof body.version === "string" ? body.version.trim() || null : null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const standard = await prisma.standard.update({ where: { id }, data });
  return NextResponse.json(standard);
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
  await prisma.standard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
