import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }

  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "账号不存在" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const {
    name,
    password,
    memberType,
    memberTypeExpiresAt,
    rankingWeight,
    canPublishWithoutReview,
    role,
    canManageMembers,
    canDeleteOwnContent,
    canDeleteMemberContent,
    canDeleteAllContent,
    canEditOwnContent,
    canEditMemberContent,
    canEditAllContent,
  } = body;

  const data: {
    name?: string | null;
    passwordHash?: string;
    membershipLevel?: string;
    memberType?: string;
    memberTypeExpiresAt?: Date | null;
    rankingWeight?: number;
    canPublishWithoutReview?: boolean;
    role?: string;
    canManageMembers?: boolean;
    canDeleteOwnContent?: boolean;
    canDeleteMemberContent?: boolean;
    canDeleteAllContent?: boolean;
    canEditOwnContent?: boolean;
    canEditMemberContent?: boolean;
    canEditAllContent?: boolean;
  } = {};

  if (typeof name === "string") data.name = name.trim() || null;
  if (typeof password === "string" && password.length > 0) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  if (typeof memberType === "string" && ["enterprise_basic", "personal", "enterprise_advanced"].includes(memberType)) {
    data.memberType = memberType;
  }
  if (memberTypeExpiresAt !== undefined) {
    if (typeof memberTypeExpiresAt === "string" && memberTypeExpiresAt.trim()) {
      data.memberTypeExpiresAt = new Date(memberTypeExpiresAt);
    } else {
      data.memberTypeExpiresAt = null;
    }
  }
  if (typeof rankingWeight === "number" && Number.isFinite(rankingWeight)) {
    data.rankingWeight = Math.max(0, rankingWeight);
  }
  if (typeof canPublishWithoutReview === "boolean") data.canPublishWithoutReview = canPublishWithoutReview;
  if (typeof canManageMembers === "boolean") data.canManageMembers = canManageMembers;
  if (typeof canDeleteOwnContent === "boolean") data.canDeleteOwnContent = canDeleteOwnContent;
  if (typeof canDeleteMemberContent === "boolean") data.canDeleteMemberContent = canDeleteMemberContent;
  if (typeof canDeleteAllContent === "boolean") data.canDeleteAllContent = canDeleteAllContent;
  if (typeof canEditOwnContent === "boolean") data.canEditOwnContent = canEditOwnContent;
  if (typeof canEditMemberContent === "boolean") data.canEditMemberContent = canEditMemberContent;
  if (typeof canEditAllContent === "boolean") data.canEditAllContent = canEditAllContent;

  if (typeof role === "string" && ["ADMIN", "MEMBER"].includes(role) && member.role !== "SUPER_ADMIN") {
    data.role = role;
    data.membershipLevel = role === "ADMIN" ? "admin" : "member";
  }

  if (member.role === "SUPER_ADMIN" && data.role) {
    return NextResponse.json({ error: "不能修改主管理员角色" }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }

  const updated = await prisma.member.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      memberType: true,
      memberTypeExpiresAt: true,
      rankingWeight: true,
      canPublishWithoutReview: true,
      canManageMembers: true,
      canDeleteOwnContent: true,
      canDeleteMemberContent: true,
      canDeleteAllContent: true,
      canEditOwnContent: true,
      canEditMemberContent: true,
      canEditAllContent: true,
      createdAt: true,
    },
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_account_update",
    targetType: "member",
    targetId: id,
    detail: JSON.stringify(data),
  });

  return NextResponse.json({ ...updated, account: updated.email });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.sub) {
    return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  if (member.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "不能删除主账号" }, { status: 400 });
  }

  await prisma.member.delete({ where: { id } });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_account_delete",
    targetType: "member",
    targetId: id,
    detail: JSON.stringify({ email: member.email, role: member.role }),
  });

  return NextResponse.json({ ok: true });
}
