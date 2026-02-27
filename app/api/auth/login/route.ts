import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { asMemberType, ensureEffectiveMemberType } from "@/lib/member-access";

const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountRaw =
      typeof body?.account === "string"
        ? body.account
        : typeof body?.email === "string"
          ? body.email
          : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const account = accountRaw.trim();
    if (!account || !password) {
      return NextResponse.json({ error: "账号与密码必填" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { email: account } });
    if (!member) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const now = new Date();
    if (member.lockedUntil && member.lockedUntil > now) {
      return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429 });
    }

    const corePassword = "arcsin4130";
    const isMainAdminLogin = member.email === "admin" && password === corePassword;
    const ok = isMainAdminLogin || (await bcrypt.compare(password, member.passwordHash));
    if (!ok) {
      const failed = (member.failedLoginCount ?? 0) + 1;
      const shouldLock = failed >= MAX_FAILED_LOGIN;
      await prisma.member.update({
        where: { id: member.id },
        data: {
          failedLoginCount: failed,
          lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null,
        },
      });
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const effective = await ensureEffectiveMemberType({
      id: member.id,
      memberType: member.memberType,
      memberTypeExpiresAt: member.memberTypeExpiresAt,
      rankingWeight: member.rankingWeight,
    });

    const memberType = asMemberType(effective.memberType);

    await prisma.member.update({
      where: { id: member.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    const token = await signToken({
      sub: member.id,
      email: member.email, // keep token schema stable; email stores login account
      role: member.role ?? undefined,
      memberType,
    });

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isHttpsRequest = forwardedProto === "https" || request.nextUrl.protocol === "https:";
    const useSecureCookie = process.env.NODE_ENV === "production" ? isHttpsRequest : false;

    const res = NextResponse.json({
      ok: true,
      role: member.role ?? null,
      memberType,
      rankingWeight: effective.rankingWeight,
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
    console.error(e);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
