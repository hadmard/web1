import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

function normalizeAccount(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOptionalText(value: unknown, max = 200) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const account = normalizeAccount(body?.account);
    const requestNote = normalizeOptionalText(body?.requestNote, 300);
    const contactInfo = normalizeOptionalText(body?.contactInfo, 120);

    if (!account) {
      return NextResponse.json({ error: "请输入账号。" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { email: account },
      select: {
        id: true,
        email: true,
        recoveryEmail: true,
      },
    });

    if (!member) {
      return NextResponse.json({
        ok: true,
        message: "申请已提交。如账号存在，管理员会尽快核实并处理。",
      });
    }

    const existing = await prisma.passwordRecoveryRequest.findFirst({
      where: {
        memberId: member.id,
        status: { in: ["pending", "processing", "sent"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "该账号已有待处理找回申请，请勿重复提交。" }, { status: 400 });
    }

    const created = await prisma.passwordRecoveryRequest.create({
      data: {
        memberId: member.id,
        account: member.email,
        requestNote,
        contactInfo,
        recoveryEmailSnapshot: member.recoveryEmail,
      },
    });

    await writeOperationLog({
      actorId: member.id,
      actorEmail: member.email,
      action: "password_recovery_request_created",
      targetType: "password_recovery_request",
      targetId: created.id,
      detail: JSON.stringify({ requestNote, contactInfo }),
    });

    return NextResponse.json({
      ok: true,
      message: "找回申请已提交，管理员可在后台“密码找回申请”中处理。",
    });
  } catch (error) {
    console.error("POST /api/auth/password/recovery-request", error);
    return NextResponse.json({ error: "提交找回申请失败，请稍后重试。" }, { status: 500 });
  }
}
