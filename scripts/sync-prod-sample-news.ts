import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";

type SampleArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  subHref: string | null;
  categoryHref: string | null;
  publishedAt: string | null;
  sourceUrl: string | null;
  source: string | null;
  status: string;
  coverImage: string | null;
  contentHash: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

type SyncItemReport = {
  article_id: string;
  slug: string;
  title: string;
  old_url: string;
  new_url: string;
  status: string;
  published_at: string | null;
  content_length: number;
  excerpt_length: number;
};

type VerificationRow = {
  slug: string;
  status: string;
};

function readArg(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function stripTags(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
  );
}

function previewText(input: string, max = 200) {
  const plain = stripTags(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}

function buildContentHash(title: string, contentText: string) {
  return createHash("sha256")
    .update(normalizeWhitespace(`${title}\n${contentText}`), "utf8")
    .digest("hex");
}

function resolveDatabaseTarget() {
  const envCandidates = [
    process.env.DATABASE_URL?.trim(),
    tryReadDatabaseUrl(resolve(process.cwd(), ".env.production")),
    tryReadDatabaseUrl(resolve(process.cwd(), ".env")),
  ].filter(Boolean) as string[];

  const raw = envCandidates[0] ?? "";
  if (!raw) {
    return { source: "not_found", host: "", port: "", database: "" };
  }

  const sanitized = raw.replace(/^postgres(ql)?:\/\//, "http://");
  try {
    const parsed = new URL(sanitized);
    return {
      source: raw === process.env.DATABASE_URL?.trim() ? "env" : "env_file",
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, "").split("?")[0],
    };
  } catch {
    return { source: "parse_failed", host: "", port: "", database: "" };
  }
}

function tryReadDatabaseUrl(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(/^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

function loadSamples(): SampleArticle[] {
  const filePath = resolve(process.cwd(), "data", "prod-sample-news.json");
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as SampleArticle[];

  if (!Array.isArray(parsed) || parsed.length !== 10) {
    throw new Error(`expected 10 sample articles in ${filePath}, got ${Array.isArray(parsed) ? parsed.length : "invalid"}`);
  }

  return parsed;
}

async function syncOne(sample: SampleArticle): Promise<SyncItemReport> {
  console.log(`upserting article: ${sample.slug}`);

  const slugConflict = await prisma.article.findUnique({
    where: { slug: sample.slug },
    select: { id: true },
  });

  if (slugConflict && slugConflict.id !== sample.id) {
    throw new Error(`slug conflict: ${sample.slug} already belongs to ${slugConflict.id}`);
  }

  const normalizedContent = normalizeRichTextField(sample.content) ?? sample.content;
  const contentText = stripTags(normalizedContent);

  if (!contentText || contentText.length < 80) {
    throw new Error(`content too short for ${sample.slug}`);
  }

  const title = sample.title.trim();
  const excerpt = sample.excerpt?.trim() || previewText(contentText, 200);
  const publishedAt = sample.publishedAt ? new Date(sample.publishedAt) : new Date();
  const reviewedAt = sample.reviewedAt ? new Date(sample.reviewedAt) : new Date();
  const sourceUrl = sample.sourceUrl?.trim() || "";
  const source = "中华整木网旧站";
  const reviewNote = "样板文章线上同步";
  const status = "approved";

  const article = await prisma.article.upsert({
    where: { id: sample.id },
    update: {
      slug: sample.slug,
      title,
      source,
      sourceUrl,
      excerpt,
      content: normalizedContent,
      coverImage: sample.coverImage,
      subHref: sample.subHref ?? "/news",
      categoryHref: sample.categoryHref ?? "/news",
      publishedAt,
      status,
      contentHash: sample.contentHash?.trim() || buildContentHash(title, contentText),
      reviewedAt,
      reviewNote,
    },
    create: {
      id: sample.id,
      slug: sample.slug,
      title,
      source,
      sourceUrl,
      excerpt,
      content: normalizedContent,
      coverImage: sample.coverImage,
      subHref: sample.subHref ?? "/news",
      categoryHref: sample.categoryHref ?? "/news",
      publishedAt,
      status,
      contentHash: sample.contentHash?.trim() || buildContentHash(title, contentText),
      reviewedAt,
      reviewNote,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      content: true,
      excerpt: true,
      sourceUrl: true,
    },
  });

  return {
    article_id: article.id,
    slug: article.slug,
    title: article.title,
    old_url: article.sourceUrl ?? sourceUrl,
    new_url: `https://cnzhengmu.com/news/${article.slug}`,
    status: article.status,
    published_at: article.publishedAt?.toISOString() ?? null,
    content_length: stripTags(article.content).length,
    excerpt_length: (article.excerpt ?? "").length,
  };
}

async function verifyRows(slugs: string[]) {
  return prisma.$queryRaw<VerificationRow[]>(
    Prisma.sql`
      SELECT slug, status
      FROM articles
      WHERE slug IN (${Prisma.join(slugs)})
      ORDER BY slug
    `,
  );
}

async function main() {
  console.log("start sync");
  const reportArg = readArg("report");
  const reportPath = reportArg
    ? resolve(reportArg)
    : resolve(process.cwd(), "custom", "reports", `prod-sample-news-sync-${Date.now()}.json`);
  console.log("connecting db");
  const dbTarget = resolveDatabaseTarget();
  console.log(
    `db target: source=${dbTarget.source} host=${dbTarget.host || "unknown"} port=${dbTarget.port || "unknown"} database=${dbTarget.database || "unknown"}`,
  );
  console.log(`env database url present: ${process.env.DATABASE_URL ? "yes" : "no"}`);
  console.log(`node version: ${process.version}`);
  const samples = loadSamples();
  const items: SyncItemReport[] = [];

  for (const sample of samples) {
    items.push(await syncOne(sample));
  }

  const verification = await verifyRows(samples.map((sample) => sample.slug));
  const payload = {
    generatedAt: new Date().toISOString(),
    databaseTarget: dbTarget,
    sampleCount: samples.length,
    items,
    verification,
  };

  writeFileSync(reportPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
