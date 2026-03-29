import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-recovery";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!token || !newPassword) {
      return NextResponse.json({ error: "重置凭证和新密码必填。" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少 6 位。" }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(token);
    const member = await prisma.member.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "重置链接无效或已过期。" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.member.update({
      where: { id: member.id },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null,
      },
    });

    await writeOperationLog({
      actorId: member.id,
      actorEmail: member.email,
      action: "password_reset_completed",
      targetType: "member",
      targetId: member.id,
      detail: JSON.stringify({ account: member.email }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/password/reset", error);
    return NextResponse.json({ error: "重置密码失败，请稍后重试。" }, { status: 500 });
  }
}
