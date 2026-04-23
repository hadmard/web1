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
  const data: {
    title?: string;
    source?: string | null;
    methodology?: string | null;
    content?: string | null;
    year?: number | null;
  } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (body.source !== undefined) data.source = typeof body.source === "string" ? body.source.trim() || null : null;
  if (body.methodology !== undefined) data.methodology = typeof body.methodology === "string" ? body.methodology.trim() || null : null;
  if (body.content !== undefined) data.content = normalizeRichTextField(body.content);
  if (body.year !== undefined) {
    const y = typeof body.year === "number" ? body.year : parseInt(String(body.year), 10);
    data.year = Number.isNaN(y) ? null : y;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }
  const item = await prisma.industryData.update({ where: { id }, data });
  return NextResponse.json(item);
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
  await prisma.industryData.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
