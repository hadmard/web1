import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { writeOperationLog } from "./operation-log";
import { buildPublicNewsUrl } from "./share-config";

const BAIDU_PUSH_ENDPOINT = "http://data.zz.baidu.com/urls";
const DEFAULT_BAIDU_SITE = "cnzhengmu.com";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_QUEUE_SCAN_LIMIT = 200;
const DEFAULT_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

export type PushableNewsArticle = {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  content?: string | null;
  status?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

type PushContext = {
  actorId?: string | null;
  actorEmail?: string | null;
  source?: string;
};

type ResolvedPushTarget =
  | { ok: true; url: string; canonical: string }
  | { ok: false; reason: string };

type QueueJobStatus = "pending" | "success" | "failed" | "skipped";

type QueueJobRow = {
  id: string;
  articleId: string;
  url: string | null;
  status: QueueJobStatus;
  source: string | null;
  lastError: string | null;
  lastResponse: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  pushedAt: Date | null;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LastPushLogSnapshot = {
  action: string;
  createdAt: Date;
};

export type PendingQueueItem = QueueJobRow & { article: PushableNewsArticle };

export type BaiduPushResult = {
  pushedUrl: string | null;
  success: number | null;
  remain: number | null;
  error: string | null;
  skipped: boolean;
  reason: string | null;
  response: unknown;
};

function isNewsHref(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("/news");
}

function isNumericLegacyNewsSlug(value: string | null | undefined) {
  return typeof value === "string" && /^\d+(?:-[a-z])?$/.test(value.trim());
}

function isCorruptedText(value: string | null | undefined) {
  if (typeof value !== "string") return true;
  const normalized = value.trim();
  return !normalized || normalized.includes("???") || normalized.includes("\uFFFD");
}

function isValidNewsSlug(value: string | null | undefined) {
  if (typeof value !== "string") return false;
  const slug = value.trim();
  if (!slug || isNumericLegacyNewsSlug(slug)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-?$/.test(slug);
}

function buildBaiduPushApiUrl() {
  const token = process.env.BAIDU_PUSH_TOKEN?.trim();
  if (!token) return null;

  const site = process.env.BAIDU_PUSH_SITE?.trim() || DEFAULT_BAIDU_SITE;
  return `${BAIDU_PUSH_ENDPOINT}?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`;
}

function stringifyResponse(input: unknown) {
  if (input == null) return null;

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function getNextRetryAt(error: string | null, skipped: boolean) {
  if (skipped && error !== "missing_baidu_push_token") return null;

  if (error === "over quota") {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 10, 0, 0);
    return next;
  }

  return new Date(Date.now() + DEFAULT_RETRY_DELAY_MS);
}

function mapResultToQueueStatus(result: BaiduPushResult): QueueJobStatus {
  if (result.skipped && result.reason !== "missing_baidu_push_token") return "skipped";
  if (result.skipped && result.reason === "missing_baidu_push_token") return "failed";
  if (!result.error) return "success";
  if (result.error === "over quota") return "pending";
  return "failed";
}

async function ensureBaiduPushJobsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "baidu_push_jobs" (
      "id" TEXT PRIMARY KEY,
      "article_id" TEXT NOT NULL UNIQUE REFERENCES "articles"("id") ON DELETE CASCADE,
      "url" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "source" TEXT,
      "last_error" TEXT,
      "last_response" TEXT,
      "attempt_count" INTEGER NOT NULL DEFAULT 0,
      "last_attempt_at" TIMESTAMP(3),
      "pushed_at" TIMESTAMP(3),
      "next_retry_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "baidu_push_jobs_status_next_retry_at_idx"
    ON "baidu_push_jobs"("status", "next_retry_at");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "baidu_push_jobs_pushed_at_idx"
    ON "baidu_push_jobs"("pushed_at");
  `);
}

async function findBaiduPushJob(articleId: string) {
  await ensureBaiduPushJobsTable();
  const rows = await prisma.$queryRawUnsafe<QueueJobRow[]>(
    `
      SELECT
        "id" AS "id",
        "article_id" AS "articleId",
        "url" AS "url",
        "status" AS "status",
        "source" AS "source",
        "last_error" AS "lastError",
        "last_response" AS "lastResponse",
        "attempt_count" AS "attemptCount",
        "last_attempt_at" AS "lastAttemptAt",
        "pushed_at" AS "pushedAt",
        "next_retry_at" AS "nextRetryAt",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
      FROM "baidu_push_jobs"
      WHERE "article_id" = $1
      LIMIT 1
    `,
    articleId,
  );

  return rows[0] ?? null;
}

async function findLatestPushLog(articleId: string) {
  const row = await prisma.operationLog.findFirst({
    where: {
      targetType: "article",
      targetId: articleId,
      action: { in: ["baidu_push_submitted", "baidu_push_failed", "baidu_push_skipped"] },
    },
    orderBy: { createdAt: "desc" },
    select: { action: true, createdAt: true },
  });

  return row as LastPushLogSnapshot | null;
}

async function saveBaiduPushJob(
  article: PushableNewsArticle,
  payload: {
    url: string | null;
    status: QueueJobStatus;
    source?: string;
    lastError?: string | null;
    lastResponse?: string | null;
    incrementAttempt?: boolean;
    nextRetryAt?: Date | null;
    pushedAt?: Date | null;
    forcePending?: boolean;
  },
) {
  if (!article.id) return;

  const existing = await findBaiduPushJob(article.id);
  const nextStatus =
    payload.forcePending
      ? "pending"
      : existing?.status === "success" && existing.url === payload.url && payload.status === "pending"
        ? "success"
        : payload.status;

  const now = new Date();
  const attemptCount = existing ? existing.attemptCount + (payload.incrementAttempt ? 1 : 0) : payload.incrementAttempt ? 1 : 0;
  const lastAttemptAt = payload.incrementAttempt ? now : existing?.lastAttemptAt ?? null;
  const pushedAt = payload.pushedAt ?? (nextStatus === "success" ? now : null);

  await ensureBaiduPushJobsTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "baidu_push_jobs" (
        "id",
        "article_id",
        "url",
        "status",
        "source",
        "last_error",
        "last_response",
        "attempt_count",
        "last_attempt_at",
        "pushed_at",
        "next_retry_at",
        "created_at",
        "updated_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
      ON CONFLICT ("article_id") DO UPDATE SET
        "url" = EXCLUDED."url",
        "status" = EXCLUDED."status",
        "source" = EXCLUDED."source",
        "last_error" = EXCLUDED."last_error",
        "last_response" = EXCLUDED."last_response",
        "attempt_count" = EXCLUDED."attempt_count",
        "last_attempt_at" = EXCLUDED."last_attempt_at",
        "pushed_at" = EXCLUDED."pushed_at",
        "next_retry_at" = EXCLUDED."next_retry_at",
        "updated_at" = CURRENT_TIMESTAMP
    `,
    existing?.id ?? randomUUID(),
    article.id,
    payload.url,
    nextStatus,
    payload.source ?? null,
    payload.lastError ?? null,
    payload.lastResponse ?? null,
    attemptCount,
    lastAttemptAt,
    pushedAt,
    payload.nextRetryAt ?? null,
    existing?.createdAt ?? null,
  );
}

export function resolvePushableNewsUrl(article: PushableNewsArticle): ResolvedPushTarget {
  const slug = article.slug?.trim() ?? "";
  const isNews = isNewsHref(article.categoryHref) || isNewsHref(article.subHref);

  if (article.status !== "approved") {
    return { ok: false, reason: "status_not_approved" };
  }

  if (!isNews) {
    return { ok: false, reason: "not_news_page" };
  }

  if (!isValidNewsSlug(slug)) {
    return { ok: false, reason: "invalid_or_legacy_slug" };
  }

  if (isCorruptedText(article.title)) {
    return { ok: false, reason: "invalid_title" };
  }

  if (typeof article.content !== "string" || !article.content.trim()) {
    return { ok: false, reason: "empty_content" };
  }

  const url = buildPublicNewsUrl(slug);
  return { ok: true, url, canonical: url };
}

export async function ensureBaiduPushJob(article: PushableNewsArticle, context: PushContext = {}) {
  const resolved = resolvePushableNewsUrl(article);
  const existing = article.id ? await findBaiduPushJob(article.id) : null;

  if (!resolved.ok) {
    await saveBaiduPushJob(article, {
      url: null,
      status: "skipped",
      source: context.source,
      lastError: resolved.reason,
      lastResponse: null,
      nextRetryAt: null,
      pushedAt: null,
    });
    return resolved;
  }

  const latestLog = article.id ? await findLatestPushLog(article.id) : null;
  const inferredSuccess =
    latestLog?.action === "baidu_push_submitted" &&
    (!existing || (existing.status === "pending" && existing.attemptCount === 0 && !existing.lastError));

  if (
    existing &&
    existing.url === resolved.url &&
    (existing.status === "pending" || existing.status === "failed") &&
    (existing.attemptCount > 0 || !!existing.lastError || !!existing.nextRetryAt)
  ) {
    return resolved;
  }

  await saveBaiduPushJob(article, {
    url: resolved.url,
    status: inferredSuccess ? "success" : "pending",
    source: context.source,
    lastError: null,
    lastResponse: null,
    nextRetryAt: null,
    pushedAt: inferredSuccess ? latestLog?.createdAt ?? new Date() : null,
  });

  return resolved;
}

async function logBaiduPushResult(
  result: BaiduPushResult,
  article: PushableNewsArticle,
  context: PushContext,
) {
  await writeOperationLog({
    actorId: context.actorId ?? null,
    actorEmail: context.actorEmail ?? null,
    action: result.skipped ? "baidu_push_skipped" : result.error ? "baidu_push_failed" : "baidu_push_submitted",
    targetType: "article",
    targetId: article.id ?? null,
    detail: JSON.stringify({
      source: context.source ?? "unknown",
      pushed_url: result.pushedUrl,
      success: result.success,
      remain: result.remain,
      error: result.error,
      skipped: result.skipped,
      reason: result.reason,
      response: result.response,
    }),
  });
}

export async function submitUrlToBaidu(url: string): Promise<BaiduPushResult> {
  const apiUrl = buildBaiduPushApiUrl();
  if (!apiUrl) {
    return {
      pushedUrl: url,
      success: null,
      remain: null,
      error: null,
      skipped: true,
      reason: "missing_baidu_push_token",
      response: null,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: url,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const rawText = await response.text();
    let payload: unknown = rawText;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = rawText;
    }

    const responseObject =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;

    return {
      pushedUrl: url,
      success: typeof responseObject?.success === "number" ? responseObject.success : null,
      remain: typeof responseObject?.remain === "number" ? responseObject.remain : null,
      error:
        !response.ok
          ? typeof responseObject?.message === "string"
            ? responseObject.message
            : `http_${response.status}`
          : typeof responseObject?.error === "number" || typeof responseObject?.error === "string"
            ? String(responseObject.error)
            : null,
      skipped: false,
      reason: null,
      response: payload,
    };
  } catch (error) {
    return {
      pushedUrl: url,
      success: null,
      remain: null,
      error: error instanceof Error ? error.message : "unknown_error",
      skipped: false,
      reason: null,
      response: null,
    };
  }
}

async function syncBaiduPushJobResult(
  article: PushableNewsArticle,
  resolved: ResolvedPushTarget,
  result: BaiduPushResult,
  context: PushContext,
) {
  const url = resolved.ok ? resolved.url : null;

  await saveBaiduPushJob(article, {
    url,
    status: mapResultToQueueStatus(result),
    source: context.source,
    lastError: result.error ?? result.reason,
    lastResponse: stringifyResponse(result.response),
    incrementAttempt: !result.skipped,
    nextRetryAt: getNextRetryAt(result.error ?? result.reason, result.skipped),
    pushedAt: result.error || result.skipped ? null : new Date(),
    forcePending: result.error === "over quota",
  });
}

export async function pushApprovedNewsToBaidu(article: PushableNewsArticle, context: PushContext = {}) {
  const resolved = await ensureBaiduPushJob(article, context);
  const result = resolved.ok
    ? await submitUrlToBaidu(resolved.url)
    : {
        pushedUrl: null,
        success: null,
        remain: null,
        error: null,
        skipped: true,
        reason: resolved.reason,
        response: null,
      };

  await syncBaiduPushJobResult(article, resolved, result, context);

  const logPayload = {
    pushed_url: result.pushedUrl,
    success: result.success,
    remain: result.remain,
    error: result.error ?? result.reason,
  };

  if (result.error || result.skipped) {
    console.warn("[baidu-push]", logPayload);
  } else {
    console.info("[baidu-push]", logPayload);
  }

  await logBaiduPushResult(result, article, context);
  return result;
}

export async function enqueueApprovedNewsForBaidu(article: PushableNewsArticle, context: PushContext = {}) {
  return ensureBaiduPushJob(article, context);
}

export async function seedApprovedNewsBaiduQueue(limit = DEFAULT_QUEUE_SCAN_LIMIT) {
  const articles = await prisma.article.findMany({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      categoryHref: true,
      subHref: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  for (const article of articles) {
    await ensureBaiduPushJob(article, { source: "daily_seed" });
  }

  return articles.length;
}

export async function getPendingBaiduPushQueue(limit = 20): Promise<PendingQueueItem[]> {
  await ensureBaiduPushJobsTable();

  const rows = await prisma.$queryRawUnsafe<
    Array<
      QueueJobRow & {
        articleTitle: string | null;
        articleSlug: string | null;
        articleContent: string | null;
        articleStatus: string | null;
        articleCategoryHref: string | null;
        articleSubHref: string | null;
        articlePublishedAt: Date | null;
        articleUpdatedAt: Date | null;
      }
    >
  >(
    `
      SELECT
        j."id" AS "id",
        j."article_id" AS "articleId",
        j."url" AS "url",
        j."status" AS "status",
        j."source" AS "source",
        j."last_error" AS "lastError",
        j."last_response" AS "lastResponse",
        j."attempt_count" AS "attemptCount",
        j."last_attempt_at" AS "lastAttemptAt",
        j."pushed_at" AS "pushedAt",
        j."next_retry_at" AS "nextRetryAt",
        j."created_at" AS "createdAt",
        j."updated_at" AS "updatedAt",
        a."title" AS "articleTitle",
        a."slug" AS "articleSlug",
        a."content" AS "articleContent",
        a."status" AS "articleStatus",
        a."categoryHref" AS "articleCategoryHref",
        a."subHref" AS "articleSubHref",
        a."publishedAt" AS "articlePublishedAt",
        a."updatedAt" AS "articleUpdatedAt"
      FROM "baidu_push_jobs" j
      INNER JOIN "articles" a ON a."id" = j."article_id"
      WHERE
        j."status" IN ('pending', 'failed')
        AND (j."next_retry_at" IS NULL OR j."next_retry_at" <= NOW())
        AND a."status" = 'approved'
        AND (a."categoryHref" LIKE '/news%' OR a."subHref" LIKE '/news%')
    `,
  );

  return rows
    .map((row) => ({
      id: row.id,
      articleId: row.articleId,
      url: row.url,
      status: row.status,
      source: row.source,
      lastError: row.lastError,
      lastResponse: row.lastResponse,
      attemptCount: Number(row.attemptCount ?? 0),
      lastAttemptAt: row.lastAttemptAt ? new Date(row.lastAttemptAt) : null,
      pushedAt: row.pushedAt ? new Date(row.pushedAt) : null,
      nextRetryAt: row.nextRetryAt ? new Date(row.nextRetryAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      article: {
        id: row.articleId,
        title: row.articleTitle,
        slug: row.articleSlug,
        content: row.articleContent,
        status: row.articleStatus,
        categoryHref: row.articleCategoryHref,
        subHref: row.articleSubHref,
        publishedAt: row.articlePublishedAt ? new Date(row.articlePublishedAt) : null,
        updatedAt: row.articleUpdatedAt ? new Date(row.articleUpdatedAt) : null,
      },
    }))
    .sort((a, b) => {
      const pendingBoost = a.status === "pending" ? -1 : 0;
      const otherPendingBoost = b.status === "pending" ? -1 : 0;
      if (pendingBoost !== otherPendingBoost) return pendingBoost - otherPendingBoost;

      const publishedA = (a.article.publishedAt ?? a.article.updatedAt ?? a.updatedAt ?? a.createdAt).getTime();
      const publishedB = (b.article.publishedAt ?? b.article.updatedAt ?? b.updatedAt ?? b.createdAt).getTime();
      if (publishedA !== publishedB) return publishedB - publishedA;

      if (a.attemptCount !== b.attemptCount) return a.attemptCount - b.attemptCount;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, limit);
}
