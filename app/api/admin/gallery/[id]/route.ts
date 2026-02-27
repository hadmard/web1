import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
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
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = typeof body.title === "string" ? body.title.trim() || null : null;
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl.trim();
  if (body.alt !== undefined) data.alt = typeof body.alt === "string" ? body.alt.trim() || null : null;
  if (body.category !== undefined) data.category = typeof body.category === "string" ? body.category.trim() || null : null;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.tagSlugs === "string") data.tagSlugs = body.tagSlugs.trim() || null;
  if (body.syncToMainSite !== undefined) data.syncToMainSite = body.syncToMainSite === true;
  if (typeof body.reviewNote === "string") data.reviewNote = body.reviewNote.trim() || null;

  if (typeof body.status === "string" && ["draft", "pending", "approved", "rejected"].includes(body.status)) {
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "仅主管理员可执行审核状态变更" }, { status: 403 });
    }
    data.status = body.status;
    data.reviewedAt = body.status === "approved" || body.status === "rejected" ? new Date() : null;
    data.reviewedById = session.sub;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }

  const img = await prisma.galleryImage.update({ where: { id }, data });
  if (typeof data.status === "string") {
    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "gallery_review_status_change",
      targetType: "gallery_image",
      targetId: id,
      detail: JSON.stringify({ status: data.status }),
    });
  }
  return NextResponse.json(img);
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
  await prisma.galleryImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
