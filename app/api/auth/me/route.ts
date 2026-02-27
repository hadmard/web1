import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({
    id: session.sub,
    account: session.account,
    name: session.name,
    email: session.email,
    role: session.role,
    memberType: session.memberType,
    rankingWeight: session.rankingWeight,
    memberTypeExpiresAt: session.memberTypeExpiresAt,
    canPublishWithoutReview: session.canPublishWithoutReview,
    canManageMembers: session.canManageMembers,
    canDeleteOwnContent: session.canDeleteOwnContent,
    canDeleteMemberContent: session.canDeleteMemberContent,
    canDeleteAllContent: session.canDeleteAllContent,
    canEditOwnContent: session.canEditOwnContent,
    canEditMemberContent: session.canEditMemberContent,
    canEditAllContent: session.canEditAllContent,
  });
}
