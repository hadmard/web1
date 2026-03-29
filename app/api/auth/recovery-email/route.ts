import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeRecoveryEmail } from "@/lib/password-recovery";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({
    where: { id: session.sub },
    select: { email: true, recoveryEmail: true },
  });

  if (!member) {
    return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  }

  return NextResponse.json({
    account: member.email,
    recoveryEmail: member.recoveryEmail,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = typeof body?.recoveryEmail === "string" ? body.recoveryEmail : "";
    const recoveryEmail = raw.trim() ? normalizeRecoveryEmail(raw) : null;

    if (raw.trim() && !recoveryEmail) {
      return NextResponse.json({ error: "找回邮箱格式不正确。" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id: session.sub },
      data: { recoveryEmail },
      select: {
        email: true,
        recoveryEmail: true,
      },
    });

    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "member_recovery_email_update",
      targetType: "member",
      targetId: session.sub,
      detail: JSON.stringify({ recoveryEmail: updated.recoveryEmail }),
    });

    return NextResponse.json({
      ok: true,
      account: updated.email,
      recoveryEmail: updated.recoveryEmail,
    });
  } catch (error) {
    console.error("PATCH /api/auth/recovery-email", error);
    return NextResponse.json({ error: "保存找回邮箱失败，请稍后重试。" }, { status: 500 });
  }
}
