import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isValidMemberPhone, normalizeMemberPhone } from "@/lib/member-phone";
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
    select: { email: true, recoveryEmail: true, phone: true },
  });

  if (!member) {
    return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  }

  return NextResponse.json({
    account: member.email,
    recoveryEmail: member.recoveryEmail,
    phone: member.phone,
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
    const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
    const recoveryEmail = raw.trim() ? normalizeRecoveryEmail(raw) : null;
    const phone = phoneRaw.trim() ? normalizeMemberPhone(phoneRaw) : null;

    if (raw.trim() && !recoveryEmail) {
      return NextResponse.json({ error: "找回邮箱格式不正确。" }, { status: 400 });
    }

    if (phoneRaw.trim() && (!phone || !isValidMemberPhone(phone))) {
      return NextResponse.json({ error: "手机号格式不正确，请填写 11 位中国大陆手机号。" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id: session.sub },
      data: { recoveryEmail, phone },
      select: {
        email: true,
        recoveryEmail: true,
        phone: true,
      },
    });

    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "member_account_contact_update",
      targetType: "member",
      targetId: session.sub,
      detail: JSON.stringify({ recoveryEmail: updated.recoveryEmail, phone: updated.phone }),
    });

    return NextResponse.json({
      ok: true,
      account: updated.email,
      recoveryEmail: updated.recoveryEmail,
      phone: updated.phone,
    });
  } catch (error) {
    console.error("PATCH /api/auth/recovery-email", error);
    return NextResponse.json({ error: "保存找回邮箱失败，请稍后重试。" }, { status: 500 });
  }
}
