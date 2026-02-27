import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const members = await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      passwordPlaintext: true,
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
    orderBy: { createdAt: "desc" },
  });

  if (isSuperAdmin(session)) {
    return NextResponse.json(members.map((m) => ({ ...m, account: m.email })));
  }

  return NextResponse.json(
    members
      .filter((m) => m.id !== session.sub)
      .map((m) => ({
        id: m.id,
        displayName: m.name?.trim() || m.email,
        role: m.role,
        memberType: m.memberType,
      }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { account, email, password, name, role, memberType, memberTypeExpiresAt, rankingWeight } = body;

    const accountValue = typeof account === "string" ? account : typeof email === "string" ? email : "";
    if (!accountValue || !password || typeof password !== "string") {
      return NextResponse.json({ error: "账号与密码必填" }, { status: 400 });
    }

    const safeRole = role === "ADMIN" || role === "MEMBER" ? role : "MEMBER";

    if (session.role === "ADMIN") {
      if (!session.canManageMembers) {
        return NextResponse.json({ error: "当前子管理员未开通“添加会员”权限" }, { status: 403 });
      }
      if (safeRole !== "MEMBER") {
        return NextResponse.json({ error: "子管理员只能创建会员账号" }, { status: 403 });
      }
    }

    const normalizedEmail = String(accountValue).trim();
    const existing = await prisma.member.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "该账号已存在" }, { status: 400 });
    }

    const safeMemberType =
      memberType === "enterprise_basic" || memberType === "enterprise_advanced" || memberType === "personal"
        ? memberType
        : "enterprise_basic";

    const expiresAt =
      typeof memberTypeExpiresAt === "string" && memberTypeExpiresAt.trim()
        ? new Date(memberTypeExpiresAt)
        : null;

    const safeRankingWeight =
      typeof rankingWeight === "number" && Number.isFinite(rankingWeight) ? Math.max(0, rankingWeight) : 0;

    const passwordHash = await bcrypt.hash(String(password), 10);

    const member = await prisma.member.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        passwordPlaintext: String(password),
        name: typeof name === "string" ? name.trim() || null : null,
        role: safeRole,
        membershipLevel: safeRole === "ADMIN" ? "admin" : "member",
        memberType: safeMemberType,
        memberTypeExpiresAt: expiresAt,
        rankingWeight: safeRankingWeight,
        canPublishWithoutReview: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordPlaintext: true,
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
      action: "member_account_create",
      targetType: "member",
      targetId: member.id,
      detail: JSON.stringify({ role: member.role }),
    });

    return NextResponse.json({ ...member, account: member.email });
  } catch (e) {
    console.error("POST /api/admin/members", e);
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "创建失败，请稍后重试";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
