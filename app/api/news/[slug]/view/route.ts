import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

type Context = { params: Promise<{ slug: string }> };

const VIEW_WINDOW_SECONDS = 60 * 60;
const VIEW_WINDOW_MS = VIEW_WINDOW_SECONDS * 1000;
const BOT_UA_PATTERN =
  /bot|spider|crawl|baiduspider|bytespider|sogou|360spider|bingbot|curl|wget|python|headlesschrome|scrapy|axios|node-fetch|go-http-client/i;
const recentViewFingerprints = new Map<string, number>();

function normalizeSegment(raw: string) {
  let value = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim();
}

function buildViewCookieName(slug: string) {
  const shortHash = createHash("sha1").update(slug).digest("hex").slice(0, 16);
  return `news_view_${shortHash}`;
}

function buildCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    maxAge: VIEW_WINDOW_SECONDS,
    path: "/",
  };
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "";
}

function pruneRecentViewFingerprints(now: number) {
  recentViewFingerprints.forEach((expiresAt, key) => {
    if (expiresAt <= now) recentViewFingerprints.delete(key);
  });
}

async function isAdminRequest() {
  const token = (await cookies()).get("auth")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === "SUPER_ADMIN" || payload?.role === "ADMIN";
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const normalizedSlug = normalizeSegment(slug);
    if (!normalizedSlug) return NextResponse.json({ ok: true });

    if (await isAdminRequest()) {
      return NextResponse.json({ ok: true, skipped: "admin" });
    }

    const userAgent = (request.headers.get("user-agent") || "").trim();
    if (BOT_UA_PATTERN.test(userAgent)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    const now = Date.now();
    const cookieName = buildViewCookieName(normalizedSlug);
    const cookieValue = (await cookies()).get(cookieName)?.value;
    if (cookieValue) {
      const viewedAt = Number(cookieValue);
      if (Number.isFinite(viewedAt) && now - viewedAt < VIEW_WINDOW_MS) {
        return NextResponse.json({ ok: true, skipped: "cookie-window" });
      }
    }

    const clientIp = getClientIp(request);
    const fingerprint = createHash("sha1")
      .update([normalizedSlug, clientIp, userAgent.toLowerCase()].join("|"))
      .digest("hex");
    pruneRecentViewFingerprints(now);
    const expiresAt = recentViewFingerprints.get(fingerprint) ?? 0;
    if (expiresAt > now) {
      const deduped = NextResponse.json({ ok: true, skipped: "fingerprint-window" });
      deduped.cookies.set(cookieName, String(now), buildCookieOptions(request));
      return deduped;
    }

    await prisma.article.updateMany({
      where: {
        status: "approved",
        AND: [
          { OR: [{ id: normalizedSlug }, { slug: normalizedSlug }] },
          { OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
        ],
      },
      data: { viewCount: { increment: 1 } },
    });

    recentViewFingerprints.set(fingerprint, now + VIEW_WINDOW_MS);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, String(now), buildCookieOptions(request));
    return response;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
