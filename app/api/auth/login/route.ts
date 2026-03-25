import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAdminAccount } from "@/lib/admin-bootstrap";
import { signToken } from "@/lib/auth";
import { asMemberType, ensureEffectiveMemberType } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

async function findMemberForLogin(account: string) {
  try {
    return await prisma.member.findUnique({
      where: { email: account },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        memberType: true,
        memberTypeExpiresAt: true,
        rankingWeight: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });
  } catch (error) {
    console.warn("[login] find_member_fallback", {
      account,
      message: error instanceof Error ? error.message : String(error),
    });
    const member = await prisma.member.findUnique({
      where: { email: account },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        memberType: true,
        memberTypeExpiresAt: true,
        rankingWeight: true,
      },
    });

    if (!member) return null;
    return {
      ...member,
      failedLoginCount: 0,
      lockedUntil: null as Date | null,
    };
  }
}

async function updateLoginFailure(memberId: string, failed: number, shouldLock: boolean, now: Date) {
  try {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        failedLoginCount: failed,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
  } catch (error) {
    console.warn("[login] update_failed_login_fallback", {
      memberId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function updateLoginSuccess(memberId: string, now: Date) {
  try {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });
  } catch (error) {
    console.warn("[login] update_login_success_fallback", {
      memberId,
      message: error instanceof Error ? error.message : String(error),
    });
    try {
      await prisma.member.update({
        where: { id: memberId },
        data: {
          lastLoginAt: now,
        },
      });
    } catch (innerError) {
      console.warn("[login] update_last_login_failed", {
        memberId,
        message: innerError instanceof Error ? innerError.message : String(innerError),
      });
    }
  }
}

export async function POST(request: NextRequest) {
  let stage = "parse_body";
  let account = "";

  try {
    const body = await request.json();
    const accountRaw =
      typeof body?.account === "string"
        ? body.account
        : typeof body?.email === "string"
          ? body.email
          : "";
    const password = typeof body?.password === "string" ? body.password : "";

    account = accountRaw.trim();
    console.info("[login] request_received", { account });
    if (!account || !password) {
      return NextResponse.json({ error: "账号与密码必填" }, { status: 400 });
    }

    stage = "ensure_primary_admin";
    try {
      await ensurePrimaryAdminAccount(account);
      console.info("[login] ensure_primary_admin_ok", { account });
    } catch (error) {
      console.warn("[login] ensure_primary_admin_skipped", {
        account,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    stage = "find_member";
    const member = await findMemberForLogin(account);
    console.info("[login] find_member_result", { account, found: Boolean(member) });
    if (!member) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const now = new Date();
    if (member.lockedUntil && member.lockedUntil > now) {
      return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429 });
    }

    stage = "bcrypt_compare";
    const ok = await bcrypt.compare(password, member.passwordHash);
    console.info("[login] bcrypt_compare_result", { account, ok });
    if (!ok) {
      stage = "update_failed_login_count";
      const failed = (member.failedLoginCount ?? 0) + 1;
      const shouldLock = failed >= MAX_FAILED_LOGIN;
      await updateLoginFailure(member.id, failed, shouldLock, now);
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    stage = "ensure_effective_member_type";
    const effective = await ensureEffectiveMemberType({
      id: member.id,
      memberType: member.memberType,
      memberTypeExpiresAt: member.memberTypeExpiresAt,
      rankingWeight: member.rankingWeight,
    });

    const memberType = asMemberType(effective.memberType);

    stage = "update_login_success";
    await updateLoginSuccess(member.id, now);

    stage = "sign_token";
    const token = await signToken({
      sub: member.id,
      email: member.email,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[login] fatal_error", {
      account,
      stage,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
