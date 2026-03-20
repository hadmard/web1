import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMemberGrantSettings, normalizeMemberGrantSettings, saveMemberGrantSettings } from "@/lib/member-grants";
import { getMembershipRule } from "@/lib/membership-rules";
import { writeOperationLog } from "@/lib/operation-log";

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主管理员权限" }, { status: 403 });
  }

  const { memberId } = await params;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      memberType: true,
      rankingWeight: true,
      createdAt: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "会员不存在" }, { status: 404 });
  }

  const [grants, defaultRule] = await Promise.all([
    getMemberGrantSettings(memberId),
    getMembershipRule(member.memberType as "enterprise_basic" | "personal" | "enterprise_advanced"),
  ]);

  return NextResponse.json({ member, grants, defaultRule });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主管理员权限" }, { status: 403 });
  }

  const { memberId } = await params;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, email: true, memberType: true },
  });
  if (!member) {
    return NextResponse.json({ error: "会员不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const grants = normalizeMemberGrantSettings(body);
  await saveMemberGrantSettings(memberId, grants);

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_grant_settings_update",
    targetType: "member_grants",
    targetId: memberId,
    detail: JSON.stringify({ year: grants.year, memberType: member.memberType }),
  });

  return NextResponse.json({ ok: true, grants });
}
