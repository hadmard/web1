import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isDictionaryPath(input: string | null | undefined) {
  return typeof input === "string" && input.startsWith("/dictionary");
}

function isValidTermStructuredContent(input: string) {
  const sectionCount = (input.match(/<section>/g) ?? []).length;
  const headingCount = (input.match(/<h3>/g) ?? []).length;
  const paragraphCount = (input.match(/<p>/g) ?? []).length;
  return sectionCount > 0 && sectionCount === headingCount && sectionCount === paragraphCount;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "资讯不存在" }, { status: 404 });
  if (article.authorMemberId !== session.sub) {
    return NextResponse.json({ error: "仅可查看自己的资讯" }, { status: 403 });
  }

  return NextResponse.json(article);
}

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
  if (typeof body.isPinned === "boolean" && (session.role === "SUPER_ADMIN" || session.role === "ADMIN")) {
    data.isPinned = body.isPinned;
  }

  const nextCategoryHref =
    typeof data.categoryHref === "string" ? (data.categoryHref as string) : article.categoryHref;
  const nextSubHref =
    typeof data.subHref === "string" ? (data.subHref as string) : article.subHref;
  const isDictionary = isDictionaryPath(nextCategoryHref) || isDictionaryPath(nextSubHref);
  if (isDictionary && typeof data.content === "string" && !isValidTermStructuredContent(data.content)) {
    return NextResponse.json({ error: "词库内容必须按固定小标题分节格式提交" }, { status: 400 });
  }

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
