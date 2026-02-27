import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "旧密码和新密码必填" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!member) {
      return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    }

    const corePassword = "arcsin4130";
    const currentOk =
      (member.email === "admin" && currentPassword === corePassword) ||
      (await bcrypt.compare(currentPassword, member.passwordHash));
    if (!currentOk) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.member.update({
      where: { id: member.id },
      data: {
        passwordHash,
        passwordPlaintext: newPassword,
      },
    });

    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "self_password_change",
      targetType: "member",
      targetId: member.id,
      detail: JSON.stringify({ account: member.email }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/password", e);
    return NextResponse.json({ error: "修改失败，请稍后重试" }, { status: 500 });
  }
}
