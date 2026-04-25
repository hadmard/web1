import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { stripHtml } from "../lib/text";
import { buildArticle } from "./generate-seo-news";
import { validateInternalLinks } from "../lib/article-links";
import { evaluateSeoArticleQuality, type SeoFaqPair } from "../lib/seo-article-quality";
import { buildSeoContentHash } from "../lib/seo-dedup";

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function boolArg(name: string, fallback: boolean) {
  if (process.argv.includes(`--${name}`)) return true;
  const value = readArg(name);
  if (!value) return fallback;
  return value === "true";
}

function countPlainText(value: string) {
  return stripHtml(value).replace(/\s+/g, "").trim().length;
}

function parseFaqPairs(input?: string | null) {
  if (!input) return [] as SeoFaqPair[];
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        q: typeof item?.q === "string" ? item.q.trim() : "",
        a: typeof item?.a === "string" ? item.a.trim() : "",
      }))
      .filter((item) => item.q && item.a)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function pickPrimaryKeyword(keywordCsv: string) {
  const values = keywordCsv
    .split(/[,\n，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return values[0] || "AI推广";
}

function compactContentToRange(html: string, minLength = 1000, maxLength = 1400) {
  let next = html;
  const plainLength = () => countPlainText(next);

  if (plainLength() <= maxLength) return next;

  const removablePatterns = [
    /(<h2>[^<]*适用场景[^<]*<\/h2><p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/i,
    /(<h2>[^<]*风险边界[^<]*<\/h2><p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/i,
    /(<h2>[^<]*判断[^<]*<\/h2><p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/i,
    /(<h2>[^<]*行业背景[^<]*<\/h2><p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/i,
    /(<h2>[^<]*结尾总结[^<]*<\/h2>)<p>[\s\S]*?<\/p>/i,
  ];

  for (const pattern of removablePatterns) {
    if (plainLength() <= maxLength) break;
    next = next.replace(pattern, "$1");
  }

  if (plainLength() < minLength) return html;
  return next;
}

function needsRewrite(row: {
  title: string;
  excerpt: string | null;
  content: string | null;
  slug: string;
  manualKeywords: string | null;
  faqPairsJson: string | null;
}) {
  const faqPairs = parseFaqPairs(row.faqPairsJson);
  const report = evaluateSeoArticleQuality({
    title: row.title,
    excerpt: row.excerpt || "",
    content: row.content || "",
    slug: row.slug,
    keywords: row.manualKeywords || "",
    faqPairs,
    primaryKeyword: pickPrimaryKeyword(row.manualKeywords || ""),
  });

  return {
    faqPairs,
    report,
    shouldRewrite:
      report.bodyLength < 900 ||
      report.h2Count < 5 ||
      faqPairs.length < 4 ||
      report.issues.includes("excerpt_duplicates_first_paragraph") ||
      report.issues.length > 0,
  };
}

function filterLegacyCompatibleIssues(issues: string[]) {
  const ignored = new Set([
    "slug_not_canonical_enough",
    "title_missing_primary_keyword",
    "primary_keyword_frequency_out_of_range",
  ]);
  return issues.filter((item) => !ignored.has(item));
}
async function main() {
  const dryRun = boolArg("dry-run", false) || boolArg("dryRun", false);
  const limit = Number(readArg("limit") || "0");
  const statusArg = readArg("status").trim();
  const statuses = statusArg ? statusArg.split(",").map((item) => item.trim()).filter(Boolean) : ["pending", "approved"];

  const rows = await prisma.article.findMany({
    where: {
      sourceType: "ai_generated",
      status: { in: statuses },
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit > 0 ? limit : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      manualKeywords: true,
      faqPairsJson: true,
      status: true,
      publishedAt: true,
      categoryHref: true,
      subHref: true,
    },
  });

  const targets = rows.filter((row) => needsRewrite(row).shouldRewrite);
  const updated: Array<{
    id: string;
    slug: string;
    title: string;
    bodyLength: number;
    h2Count: number;
    faqCount: number;
  }> = [];
  const failed: Array<{ id: string; slug: string; title: string; reason: string }> = [];

  for (const row of targets) {
    try {
      const batchId = `rewrite-batch-${new Date().toISOString().slice(0, 10)}-${createHash("md5").update(`${row.id}-${Date.now()}`).digest("hex").slice(0, 6)}`;
      const article = await buildArticle({ title: row.title }, batchId, "manual");
      const faqPairs = article.faqPairs.slice(0, 6);
      const content = compactContentToRange(article.content);
      const qualityReport = evaluateSeoArticleQuality({
        title: article.title,
        excerpt: article.excerpt,
        content,
        slug: row.slug,
        keywords: article.keywords,
        faqPairs,
        primaryKeyword: pickPrimaryKeyword(article.keywords),
      });
      const linkValidation = await validateInternalLinks({
        html: content,
        keywordCsv: article.keywords,
      });

      const effectiveIssues = filterLegacyCompatibleIssues(qualityReport.issues);
      if (effectiveIssues.length > 0) {
        failed.push({ id: row.id, slug: row.slug, title: row.title, reason: `quality:${effectiveIssues.join(",")}` });
        continue;
      }
      if (!linkValidation.ok) {
        failed.push({
          id: row.id,
          slug: row.slug,
          title: row.title,
          reason: `links:${linkValidation.broken.map((item) => item.href).join(",")}`,
        });
        continue;
      }

      if (!dryRun) {
        await prisma.article.update({
          where: { id: row.id },
          data: {
            title: article.title,
            slug: row.slug,
            excerpt: article.excerpt,
            content,
            manualKeywords: article.keywords,
            answerSummary: article.answerSummary,
            conceptSummary: article.conceptSummary,
            applicableScenarios: article.applicableScenarios,
            faqPairsJson: JSON.stringify(faqPairs),
            faqJson: JSON.stringify(faqPairs),
            keyFactsJson: JSON.stringify(article.keyFacts),
            entityTerms: article.entityTerms.join("、"),
            claimCheckHints: article.claimCheckHints.join("\n"),
            contentHash: buildSeoContentHash(article.title, content),
            generationBatchId: batchId,
            reviewNote: `seo batch rewritten | batch=${batchId} | quality=pass | bodyLength=${qualityReport.bodyLength} | h2=${qualityReport.h2Count} | faq=${qualityReport.faqCount}`,
            status: row.status,
            publishedAt: row.publishedAt ?? (row.status === "approved" ? new Date() : null),
            categoryHref: row.categoryHref,
            subHref: row.subHref,
          },
        });
      }

      updated.push({
        id: row.id,
        slug: row.slug,
        title: article.title,
        bodyLength: qualityReport.bodyLength,
        h2Count: qualityReport.h2Count,
        faqCount: qualityReport.faqCount,
      });
    } catch (error) {
      failed.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scannedCount: rows.length,
        targetCount: targets.length,
        updatedCount: updated.length,
        failedCount: failed.length,
        updated,
        failed,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

