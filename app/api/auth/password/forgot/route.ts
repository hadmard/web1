import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetForMember } from "@/lib/password-recovery";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

function normalizeAccount(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const GENERIC_SUCCESS_MESSAGE = "如果账号存在且已配置找回邮箱，系统会发送密码重置说明。";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const account = normalizeAccount(body?.account);

    if (!account) {
      return NextResponse.json({ error: "请输入账号。" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { email: account },
      select: {
        id: true,
        email: true,
        recoveryEmail: true,
        passwordResetRequestedAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
        reason: "account_hidden",
      });
    }

    const result = await issuePasswordResetForMember({
      member,
    });

    if (!result.ok) {
      if (result.reason === "missing_recovery_email") {
        return NextResponse.json(
          {
            error: "该账号尚未绑定找回邮箱，可先提交人工找回申请。",
            needsRecoveryRequest: true,
            reason: "missing_recovery_email",
          },
          { status: 400 }
        );
      }

      if (result.reason === "email_service_unavailable") {
        console.error("POST /api/auth/password/forgot email service unavailable", {
          missingConfig: result.missingConfig,
        });
        return NextResponse.json(
          {
            error: "邮件服务未配置，请提交人工找回申请。",
            needsRecoveryRequest: true,
            reason: "email_service_unavailable",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: "请求过于频繁，请 1 分钟后再试。",
          reason: "cooldown",
        },
        { status: 429 }
      );
    }

    await writeOperationLog({
      actorId: member.id,
      actorEmail: member.email,
      action: "password_reset_requested",
      targetType: "member",
      targetId: member.id,
      detail: JSON.stringify({ deliveryEmail: result.deliveryEmail }),
    });

    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
      reason: "email_sent",
      debugResetUrl:
        result.delivery.mode === "debug" && process.env.NODE_ENV !== "production"
          ? result.delivery.resetUrl
          : undefined,
    });
  } catch (error) {
    console.error("POST /api/auth/password/forgot", error);
    return NextResponse.json(
      {
        error: "邮件发送失败，请稍后重试或提交人工找回申请。",
        needsRecoveryRequest: true,
        reason: "send_failed",
      },
      { status: 500 }
    );
  }
}
