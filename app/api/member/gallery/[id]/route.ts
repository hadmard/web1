import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  if (image.authorMemberId !== session.sub) {
    return NextResponse.json({ error: "仅可删除自己上传的图片" }, { status: 403 });
  }
  if (!session.canDeleteOwnContent) {
    return NextResponse.json({ error: "当前账号没有删除权限" }, { status: 403 });
  }

  await prisma.galleryImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
