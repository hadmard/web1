import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { asMemberType, ensureEffectiveMemberType } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

function maskAccount(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";

  if (normalized.includes("@")) {
    const [localPart, domain = ""] = normalized.split("@");
    const safeLocal =
      localPart.length <= 2
        ? `${localPart.slice(0, 1)}***`
        : `${localPart.slice(0, 1)}***${localPart.slice(-1)}`;
    return domain ? `${safeLocal}@${domain}` : safeLocal;
  }

  if (normalized.length <= 2) return `${normalized.slice(0, 1)}***`;
  if (normalized.length <= 4) return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
}

function logLoginEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>
) {
  console[level](event, payload);
}

async function findMemberForLogin(account: string, requestId: string) {
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
    logLoginEvent("warn", "[login] find_member_fallback", {
      requestId,
      stage: "find_member",
      accountMasked: maskAccount(account),
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

async function updateLoginFailure(memberId: string, failed: number, shouldLock: boolean, now: Date, requestId: string) {
  try {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        failedLoginCount: failed,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
  } catch (error) {
    logLoginEvent("warn", "[login] update_failed_login_fallback", {
      requestId,
      stage: "update_failed_login_count",
      memberId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function updateLoginSuccess(memberId: string, now: Date, requestId: string) {
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
    logLoginEvent("warn", "[login] update_login_success_fallback", {
      requestId,
      stage: "update_login_success",
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
      logLoginEvent("warn", "[login] update_last_login_failed", {
        requestId,
        stage: "update_last_login_success_fallback",
        memberId,
        message: innerError instanceof Error ? innerError.message : String(innerError),
      });
    }
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
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
    logLoginEvent("info", "[login] request_received", {
      requestId,
      stage,
      success: false,
      accountMasked: maskAccount(account),
    });
    if (!account || !password) {
      return NextResponse.json({ error: "账号与密码必填" }, { status: 400 });
    }

    stage = "find_member";
    const member = await findMemberForLogin(account, requestId);
    logLoginEvent("info", "[login] find_member_result", {
      requestId,
      stage,
      success: Boolean(member),
      found: Boolean(member),
      accountMasked: maskAccount(account),
    });
    if (!member) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const now = new Date();
    if (member.lockedUntil && member.lockedUntil > now) {
      return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429 });
    }

    stage = "bcrypt_compare";
    const ok = await bcrypt.compare(password, member.passwordHash);
    logLoginEvent("info", "[login] bcrypt_compare_result", {
      requestId,
      stage,
      success: ok,
      accountMasked: maskAccount(account),
    });
    if (!ok) {
      stage = "update_failed_login_count";
      const failed = (member.failedLoginCount ?? 0) + 1;
      const shouldLock = failed >= MAX_FAILED_LOGIN;
      await updateLoginFailure(member.id, failed, shouldLock, now, requestId);
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
    await updateLoginSuccess(member.id, now, requestId);

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

    logLoginEvent("info", "[login] auth_issued", {
      requestId,
      stage,
      success: true,
      accountMasked: maskAccount(account),
      tokenIssued: Boolean(token),
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logLoginEvent("error", "[login] fatal_error", {
      requestId,
      stage,
      success: false,
      accountMasked: maskAccount(account),
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
