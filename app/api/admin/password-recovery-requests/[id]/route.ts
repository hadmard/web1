import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdminOrSuper } from "@/lib/session";
import { issuePasswordResetForMember, normalizeRecoveryEmail } from "@/lib/password-recovery";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !requireAdminOrSuper(session)) {
    return NextResponse.json({ error: "仅管理员可操作。" }, { status: 403 });
  }
  const adminSession = session;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim().slice(0, 300) : null;
    const rawRecoveryEmail = typeof body?.recoveryEmail === "string" ? body.recoveryEmail : "";
    const recoveryEmail =
      rawRecoveryEmail.trim() === "" ? null : normalizeRecoveryEmail(rawRecoveryEmail.trim());

    if (rawRecoveryEmail.trim() && !recoveryEmail) {
      return NextResponse.json({ error: "找回邮箱格式不正确。" }, { status: 400 });
    }

    const recoveryRequest = await prisma.passwordRecoveryRequest.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            recoveryEmail: true,
            passwordResetRequestedAt: true,
          },
        },
      },
    });

    if (!recoveryRequest) {
      return NextResponse.json({ error: "找回申请不存在。" }, { status: 404 });
    }

    if (action === "save") {
      const updated = await prisma.$transaction(async (tx) => {
        if (recoveryRequest.member && rawRecoveryEmail !== "") {
          await tx.member.update({
            where: { id: recoveryRequest.member.id },
            data: { recoveryEmail },
          });
        }

        return tx.passwordRecoveryRequest.update({
          where: { id },
          data: {
            status: recoveryRequest.status === "pending" ? "processing" : recoveryRequest.status,
            recoveryEmailSnapshot: rawRecoveryEmail !== "" ? recoveryEmail : recoveryRequest.recoveryEmailSnapshot,
            adminNote,
            handledById: adminSession.sub,
            handledAt: new Date(),
          },
        });
      });

      await writeOperationLog({
        actorId: adminSession.sub,
        actorEmail: adminSession.account,
        action: "password_recovery_request_saved",
        targetType: "password_recovery_request",
        targetId: id,
        detail: JSON.stringify({ recoveryEmail, adminNote }),
      });

      return NextResponse.json({ ok: true, item: updated });
    }

    if (action === "send_reset") {
      if (!recoveryRequest.member) {
        return NextResponse.json({ error: "该申请未匹配到有效账号，无法发送重置链接。" }, { status: 400 });
      }

      const member =
        rawRecoveryEmail !== ""
          ? await prisma.member.update({
              where: { id: recoveryRequest.member.id },
              data: { recoveryEmail },
              select: {
                id: true,
                email: true,
                recoveryEmail: true,
                passwordResetRequestedAt: true,
              },
            })
          : recoveryRequest.member;

      const result = await issuePasswordResetForMember({
        member,
        origin: getRequestOrigin(request),
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              result.reason === "missing_recovery_email"
                ? "请先为该账号填写找回邮箱，再发送重置链接。"
                : "请求过于频繁，请稍后再试。",
          },
          { status: result.reason === "missing_recovery_email" ? 400 : 429 }
        );
      }

      const updated = await prisma.passwordRecoveryRequest.update({
        where: { id },
        data: {
          status: "sent",
          adminNote,
          recoveryEmailSnapshot: result.deliveryEmail,
          handledById: adminSession.sub,
          handledAt: new Date(),
          lastSentAt: new Date(),
        },
      });

      await writeOperationLog({
        actorId: adminSession.sub,
        actorEmail: adminSession.account,
        action: "password_recovery_request_sent_reset",
        targetType: "password_recovery_request",
        targetId: id,
        detail: JSON.stringify({ deliveryEmail: result.deliveryEmail }),
      });

      return NextResponse.json({
        ok: true,
        item: updated,
        debugResetUrl:
          result.delivery.mode === "debug" && process.env.NODE_ENV !== "production"
            ? result.delivery.resetUrl
            : undefined,
      });
    }

    if (action === "resolve" || action === "reject") {
      const status = action === "resolve" ? "resolved" : "rejected";
      const updated = await prisma.passwordRecoveryRequest.update({
        where: { id },
        data: {
          status,
          adminNote,
          handledById: adminSession.sub,
          handledAt: new Date(),
        },
      });

      await writeOperationLog({
        actorId: adminSession.sub,
        actorEmail: adminSession.account,
        action: `password_recovery_request_${status}`,
        targetType: "password_recovery_request",
        targetId: id,
        detail: JSON.stringify({ adminNote }),
      });

      return NextResponse.json({ ok: true, item: updated });
    }

    return NextResponse.json({ error: "不支持的操作。" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/admin/password-recovery-requests/[id]", error);
    return NextResponse.json({ error: "处理找回申请失败，请稍后重试。" }, { status: 500 });
  }
}
