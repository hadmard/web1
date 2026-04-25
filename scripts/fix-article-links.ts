import { prisma } from "../lib/prisma";
import { buildCanonicalNewsHref, isResolvableInternalPath, validateInternalLinks } from "../lib/article-links";
import { isValidKeywordCandidate } from "../lib/news-keywords-v2";

function normalizeKeywordCsv(input: string | null | undefined) {
  return Array.from(
    new Set(
      `${input || ""}`
        .split(/[,\n，、]+/)
        .map((item) => item.trim())
        .filter((item) => isValidKeywordCandidate(item)),
    ),
  )
    .slice(0, 5)
    .join("、");
}

async function resolveReplacementNewsHref(anchorText: string) {
  const keyword = anchorText.trim();
  if (!keyword) return null;

  const row = await prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [
        { title: { contains: keyword } },
        { manualKeywords: { contains: keyword } },
        { keywords: { contains: keyword } },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: { id: true, slug: true },
  });

  return row ? buildCanonicalNewsHref(row) : null;
}

async function repairContentLinks(html: string) {
  let changed = false;
  let output = html;

  const matches = Array.from(html.matchAll(/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi));
  for (const match of matches) {
    const full = match[0];
    const href = String(match[3] || "").trim();
    const inner = String(match[5] || "").trim();
    if (!href.startsWith("/")) continue;

    const isOk = await isResolvableInternalPath(href);
    if (isOk) continue;

    if (/^\/news\//.test(href)) {
      const replacement = await resolveReplacementNewsHref(inner);
      if (replacement) {
        output = output.replace(full, full.replace(href, replacement));
        changed = true;
        continue;
      }
    }

    output = output.replace(full, inner);
    changed = true;
  }

  return { html: output, changed };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
  const rows = await prisma.article.findMany({
    where: {
      status: { in: ["approved", "pending"] },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      content: true,
      manualKeywords: true,
    },
  });

  const fixed: Array<{
    articleId: string;
    title: string;
    slug: string;
    updatedFields: string[];
  }> = [];
  const unresolved: Array<{
    articleId: string;
    title: string;
    slug: string;
    broken: Array<{ href: string; reason: string }>;
  }> = [];

  for (const row of rows) {
    const repairedContent = await repairContentLinks(row.content);
    const normalizedKeywords = normalizeKeywordCsv(row.manualKeywords);
    const content = repairedContent.html;
    const manualKeywords = normalizedKeywords || null;

    const validation = await validateInternalLinks({ html: content, keywordCsv: manualKeywords });
    const updatedFields: string[] = [];

    if (repairedContent.changed) updatedFields.push("content");
    if ((row.manualKeywords || "") !== (manualKeywords || "")) updatedFields.push("manualKeywords");

    if (updatedFields.length > 0 && validation.ok) {
      fixed.push({
        articleId: row.id,
        title: row.title,
        slug: row.slug,
        updatedFields,
      });

      if (!dryRun) {
        await prisma.article.update({
          where: { id: row.id },
          data: {
            content,
            manualKeywords,
          },
        });
      }
      continue;
    }

    if (!validation.ok) {
      unresolved.push({
        articleId: row.id,
        title: row.title,
        slug: row.slug,
        broken: validation.broken,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scannedCount: rows.length,
        fixedCount: fixed.length,
        unresolvedCount: unresolved.length,
        fixed,
        unresolved,
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

