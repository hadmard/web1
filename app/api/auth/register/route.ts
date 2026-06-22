import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isValidMemberPhone, normalizeMemberPhone } from "@/lib/member-phone";
import { normalizeRecoveryEmail } from "@/lib/password-recovery";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { writeOperationLog } from "@/lib/operation-log";
import { consumeRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const REGISTER_WINDOW_MS = 30 * 60 * 1000;
const REGISTER_IP_LIMIT = 10;

function normalizeAccount(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const ipLimit = consumeRateLimit({
      scope: "auth-register:ip",
      identifier: getClientIp(request),
      limit: REGISTER_IP_LIMIT,
      windowMs: REGISTER_WINDOW_MS,
    });
    if (!ipLimit.allowed) {
      return createRateLimitResponse(ipLimit.retryAfterSec);
    }

    const body = await request.json().catch(() => ({}));
    const accountRaw = typeof body?.account === "string" ? body.account : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const nameRaw = typeof body?.name === "string" ? body.name : "";
    const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
    const recoveryEmailRaw = typeof body?.recoveryEmail === "string" ? body.recoveryEmail : "";

    const account = normalizeAccount(accountRaw);
    const name = nameRaw.trim();
    const phone = normalizeMemberPhone(phoneRaw);
    const recoveryEmail = recoveryEmailRaw.trim() ? normalizeRecoveryEmail(recoveryEmailRaw) : null;

    if (!account || !password || !phone) {
      return NextResponse.json({ error: "账号、手机号与密码必填" }, { status: 400 });
    }

    if (account.length < 4) {
      return NextResponse.json({ error: "账号至少 4 位" }, { status: 400 });
    }

    if (!/^[a-z0-9._-]+$/.test(account)) {
      return NextResponse.json({ error: "账号仅支持小写字母、数字、点、下划线和短横线" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    if (!isValidMemberPhone(phone)) {
      return NextResponse.json({ error: "手机号格式不正确，请填写 11 位中国大陆手机号" }, { status: 400 });
    }

    if (recoveryEmailRaw.trim() && !recoveryEmail) {
      return NextResponse.json({ error: "找回邮箱格式不正确" }, { status: 400 });
    }

    const existing = await prisma.member.findUnique({
      where: { email: account },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "该账号已存在" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const member = await prisma.member.create({
      data: {
        email: account,
        name: name || null,
        phone,
        recoveryEmail,
        role: "MEMBER",
        membershipLevel: "member",
        memberType: "personal",
        rankingWeight: 0,
        passwordHash,
        registeredAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        memberType: true,
      },
    });

    await writeOperationLog({
      actorId: member.id,
      actorEmail: member.email,
      action: "self_register",
      targetType: "member",
      targetId: member.id,
      detail: JSON.stringify({ memberType: member.memberType }),
    });

    const token = await signToken({
      sub: member.id,
      email: member.email,
      role: member.role,
      memberType: member.memberType,
    });

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isHttpsRequest = forwardedProto === "https" || request.nextUrl.protocol === "https:";
    const useSecureCookie = process.env.NODE_ENV === "production" ? isHttpsRequest : false;

    const res = NextResponse.json({
      ok: true,
      role: member.role,
      memberType: member.memberType,
    });
    res.cookies.set("auth", token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("POST /api/auth/register", e);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
