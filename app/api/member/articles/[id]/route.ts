import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "资讯不存在" }, { status: 404 });
  if (article.authorMemberId !== session.sub) {
    return NextResponse.json({ error: "仅可操作自己的资讯" }, { status: 403 });
  }
  if (!session.canEditOwnContent) {
    return NextResponse.json({ error: "当前账号没有直接修改权限，请提交修改申请" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.excerpt === "string") data.excerpt = body.excerpt.trim() || null;
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.coverImage === "string") data.coverImage = body.coverImage.trim() || null;
  if (typeof body.subHref === "string") data.subHref = body.subHref.trim() || null;
  if (typeof body.categoryHref === "string") data.categoryHref = body.categoryHref.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }

  const updated = await prisma.article.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "资讯不存在" }, { status: 404 });
  if (article.authorMemberId !== session.sub) {
    return NextResponse.json({ error: "仅可删除自己的资讯" }, { status: 403 });
  }
  if (!session.canDeleteOwnContent) {
    return NextResponse.json({ error: "当前账号没有删除权限" }, { status: 403 });
  }

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
