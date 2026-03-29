import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetForMember } from "@/lib/password-recovery";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

function normalizeAccount(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin;
  return request.nextUrl.origin;
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
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const result = await issuePasswordResetForMember({
      member,
      origin: getRequestOrigin(request),
    });

    if (!result.ok) {
      if (result.reason === "missing_recovery_email") {
        return NextResponse.json(
          {
            error: "该账号尚未绑定找回邮箱，可先提交人工找回申请。",
            needsRecoveryRequest: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: "请求过于频繁，请 1 分钟后再试。" }, { status: 429 });
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
      debugResetUrl:
        result.delivery.mode === "debug" && process.env.NODE_ENV !== "production"
          ? result.delivery.resetUrl
          : undefined,
    });
  } catch (error) {
    console.error("POST /api/auth/password/forgot", error);
    return NextResponse.json({ error: "发送重置说明失败，请稍后重试。" }, { status: 500 });
  }
}
