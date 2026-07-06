import { createHash, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getSuspiciousWindowHours,
  shouldSkipArticleViewCountForSuspicion,
} from "@/lib/article-view-suspicion";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const VIEW_WINDOW_SECONDS = 60 * 60;
const VIEW_WINDOW_MS = VIEW_WINDOW_SECONDS * 1000;
const CLEANUP_WINDOW_MS = 24 * VIEW_WINDOW_MS;
const BOT_UA_PATTERN =
  /bot|spider|crawl|baiduspider|bytespider|sogou|360spider|bingbot|curl|wget|python|headlesschrome|scrapy|axios|node-fetch|go-http-client/i;

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

function buildViewCookieName(articleId: string) {
  const shortHash = createHash("sha1").update(articleId).digest("hex").slice(0, 16);
  return `article_view_${shortHash}`;
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
  return forwardedFor || realIp || "unknown";
}

function normalizeUserAgent(request: NextRequest) {
  const userAgent = (request.headers.get("user-agent") || "").trim();
  return userAgent.slice(0, 500) || "unknown";
}

function normalizeReferer(request: NextRequest) {
  const referer = (request.headers.get("referer") || "").trim();
  return referer.slice(0, 500);
}

function getViewDedupSalt() {
  return (
    process.env.VIEW_DEDUP_SALT?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    ""
  );
}

function hmacValue(value: string, salt: string) {
  return createHmac("sha256", salt).update(value).digest("hex");
}

function getWindowStart(now: number) {
  return new Date(now - (now % VIEW_WINDOW_MS));
}

async function cleanupExpiredDedupRecords(now: number) {
  if (Math.random() >= 0.01) return;

  try {
    await prisma.articleViewDedup.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(now - CLEANUP_WINDOW_MS),
        },
      },
    });
  } catch (error) {
    console.warn("[article-view] cleanup_failed", error);
  }
}

async function isAdminRequest() {
  const token = (await cookies()).get("auth")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === "SUPER_ADMIN" || payload?.role === "ADMIN";
}

async function getSuspiciousTrafficStats(articleId: string, uaHash: string, ipHash: string) {
  const since = new Date(Date.now() - getSuspiciousWindowHours() * 60 * 60 * 1000);
  const rows = await prisma.articleViewDedup.findMany({
    where: {
      articleId,
      uaHash,
      createdAt: {
        gte: since,
      },
    },
    select: {
      ipHash: true,
    },
  });

  const distinctIpHashes = new Set<string>();
  let ipTotalCount = 0;

  for (const row of rows) {
    if (row.ipHash) distinctIpHashes.add(row.ipHash);
    if (row.ipHash === ipHash) ipTotalCount += 1;
  }

  return {
    uaDistinctIpCount: distinctIpHashes.size,
    uaTotalCount: rows.length,
    ipTotalCount,
  };
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const normalizedId = normalizeSegment(id);
    if (!normalizedId) return NextResponse.json({ ok: true, counted: false, reason: "not-found" });

    if (await isAdminRequest()) {
      return NextResponse.json({ ok: true, counted: false, reason: "admin" });
    }

    const userAgent = normalizeUserAgent(request);
    const referer = normalizeReferer(request);
    if (BOT_UA_PATTERN.test(userAgent)) {
      return NextResponse.json({ ok: true, counted: false, reason: "bot" });
    }

    const now = Date.now();
    const cookieName = buildViewCookieName(normalizedId);
    const cookieValue = (await cookies()).get(cookieName)?.value;
    if (cookieValue) {
      const viewedAt = Number(cookieValue);
      if (Number.isFinite(viewedAt) && now - viewedAt < VIEW_WINDOW_MS) {
        return NextResponse.json({ ok: true, counted: false, reason: "duplicate" });
      }
    }

    const article = await prisma.article.findFirst({
      where: {
        id: normalizedId,
        status: "approved",
      },
      select: {
        id: true,
        slug: true,
      },
    });
    if (!article) {
      return NextResponse.json({ ok: true, counted: false, reason: "not-found" });
    }

    const dedupSalt = getViewDedupSalt();
    if (!dedupSalt) {
      console.error("[article-view] missing VIEW_DEDUP_SALT and fallback auth secret");
      return NextResponse.json({ ok: true, counted: false, reason: "missing-dedup-salt" });
    }

    const clientIp = getClientIp(request);
    const ipHash = hmacValue(clientIp, dedupSalt);
    const uaHash = hmacValue(userAgent, dedupSalt);
    const fingerprintHash = hmacValue(`${article.id}|${ipHash}|${uaHash}`, dedupSalt);
    const windowStartsAt = getWindowStart(now);
    const expiresAt = new Date(windowStartsAt.getTime() + VIEW_WINDOW_MS);

    await cleanupExpiredDedupRecords(now);

    const suspiciousStats = await getSuspiciousTrafficStats(article.id, uaHash, ipHash);
    const suspiciousDecision = shouldSkipArticleViewCountForSuspicion({
      articleSlug: article.slug,
      userAgent,
      referer,
      stats: suspiciousStats,
    });
    if (suspiciousDecision.suspicious) {
      console.warn("[article-view] suspicious_traffic_skipped", {
        articleSlug: article.slug,
        reason: suspiciousDecision.reason,
        uaHash: uaHash.slice(0, 16),
        ipHash: ipHash.slice(0, 16),
        uaDistinctIpCount: suspiciousStats.uaDistinctIpCount,
        uaTotalCount: suspiciousStats.uaTotalCount,
        ipTotalCount: suspiciousStats.ipTotalCount,
      });
      const suspiciousResponse = NextResponse.json({ ok: true, counted: false, reason: "suspicious_traffic" });
      suspiciousResponse.cookies.set(cookieName, String(now), buildCookieOptions(request));
      return suspiciousResponse;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.articleViewDedup.create({
          data: {
            articleId: article.id,
            articleSlug: article.slug,
            fingerprintHash,
            ipHash,
            uaHash,
            windowStartsAt,
            expiresAt,
          },
        });

        await tx.article.update({
          where: { id: article.id },
          data: { viewCount: { increment: 1 } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const deduped = NextResponse.json({ ok: true, counted: false, reason: "duplicate" });
        deduped.cookies.set(cookieName, String(now), buildCookieOptions(request));
        return deduped;
      }

      throw error;
    }

    const response = NextResponse.json({ ok: true, counted: true });
    response.cookies.set(cookieName, String(now), buildCookieOptions(request));
    return response;
  } catch {
    return NextResponse.json({ ok: true, counted: false, reason: "error" });
  }
}
