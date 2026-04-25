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

function pickPrimaryKeyword(keywordCsv: string) {
  return (
    keywordCsv
      .split(/[,\n，、]+/)
      .map((item) => item.trim())
      .filter(Boolean)[1] || "AI推广"
  );
}

function compactContentToRange(html: string, minLength = 1000, maxLength = 1400) {
  let next = html;
  const plainLength = () => countPlainText(next);

  if (plainLength() <= maxLength) {
    return next;
  }

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

  if (plainLength() < minLength) {
    return html;
  }

  return next;
}

async function main() {
  const slug = readArg("slug").trim();
  const title = readArg("title").trim();
  const dryRun = boolArg("dry-run", false) || boolArg("dryRun", false);
  const keepSlug = boolArg("keep-slug", true);
  const publish = boolArg("publish", true);

  if (!slug) {
    throw new Error("missing --slug");
  }
  if (!title) {
    throw new Error("missing --title");
  }

  const target = await prisma.article.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      categoryHref: true,
      subHref: true,
    },
  });

  if (!target) {
    throw new Error(`article not found: ${slug}`);
  }

  const batchId = `rewrite-seo-${new Date().toISOString().slice(0, 10)}-${createHash("md5").update(`${slug}-${Date.now()}`).digest("hex").slice(0, 6)}`;
  const article = await buildArticle({ title }, batchId, "manual");
  const content = compactContentToRange(article.content);
  const faqPairs = article.faqPairs.slice(0, 6);
  const primaryKeyword = pickPrimaryKeyword(article.keywords);
  const qualityReport = evaluateSeoArticleQuality({
    title: article.title,
    excerpt: article.excerpt,
    content,
    slug: article.slug,
    keywords: article.keywords,
    faqPairs,
    primaryKeyword,
  });
  const linkValidation = await validateInternalLinks({
    html: content,
    keywordCsv: article.keywords,
  });

  if (!qualityReport.pass) {
    throw new Error(`quality gate failed: ${qualityReport.issues.join(",")}`);
  }
  if (!linkValidation.ok) {
    throw new Error(`link validation failed: ${linkValidation.broken.map((item) => item.href).join(",")}`);
  }

  const payload = {
    title: article.title,
    slug: keepSlug ? target.slug : article.slug,
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
    sourceType: "ai_generated",
    source: article.source,
    reviewNote: `seo article rewritten | batch=${batchId} | quality=pass | bodyLength=${qualityReport.bodyLength} | h2=${qualityReport.h2Count} | faq=${qualityReport.faqCount} | keepSlug=${String(keepSlug)}`,
    status: publish || target.status === "approved" ? "approved" : target.status,
    publishedAt: target.publishedAt ?? (publish ? new Date() : null),
    categoryHref: target.categoryHref,
    subHref: target.subHref,
  } as const;

  if (!dryRun) {
    await prisma.article.update({
      where: { id: target.id },
      data: payload,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        updated: !dryRun,
        id: target.id,
        slug: payload.slug,
        title: payload.title,
        excerptLength: countPlainText(payload.excerpt),
        bodyLength: qualityReport.bodyLength,
        h2Count: qualityReport.h2Count,
        faqCount: qualityReport.faqCount,
        keywords: payload.manualKeywords,
        qualityIssues: qualityReport.issues,
        brokenLinks: linkValidation.broken,
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
