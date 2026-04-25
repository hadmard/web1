import { prisma } from "../lib/prisma";
import { validateInternalLinks } from "../lib/article-links";
import { evaluateSeoArticleQuality, type SeoFaqPair } from "../lib/seo-article-quality";

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

async function main() {
  const rows = await prisma.article.findMany({
    where: {
      status: { in: ["approved", "pending"] },
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      manualKeywords: true,
      faqPairsJson: true,
      status: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const items = [];
  let shortBodyCount = 0;
  let lowH2Count = 0;
  let noFaqCount = 0;
  let repeatedExcerptCount = 0;
  let brokenLinkCount = 0;

  for (const row of rows) {
    const faqPairs = parseFaqPairs(row.faqPairsJson);
    const report = evaluateSeoArticleQuality({
      title: row.title,
      excerpt: row.excerpt || "",
      content: row.content || "",
      slug: row.slug,
      keywords: row.manualKeywords || "",
      faqPairs,
      primaryKeyword: "AI推广",
    });
    const linkValidation = await validateInternalLinks({
      html: row.content,
      keywordCsv: row.manualKeywords,
    });

    if (report.bodyLength < 900) shortBodyCount += 1;
    if (report.h2Count < 5) lowH2Count += 1;
    if (faqPairs.length < 1) noFaqCount += 1;
    if (report.issues.includes("excerpt_duplicates_first_paragraph")) repeatedExcerptCount += 1;
    if (!linkValidation.ok) brokenLinkCount += 1;

    if (
      report.bodyLength < 900 ||
      report.h2Count < 5 ||
      faqPairs.length < 1 ||
      report.issues.includes("excerpt_duplicates_first_paragraph") ||
      !linkValidation.ok
    ) {
      items.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        bodyLength: report.bodyLength,
        h2Count: report.h2Count,
        faqCount: faqPairs.length,
        repeatedExcerpt: report.issues.includes("excerpt_duplicates_first_paragraph"),
        brokenLinks: linkValidation.broken.map((item) => item.href),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        scannedCount: rows.length,
        shortBodyCount,
        lowH2Count,
        noFaqCount,
        repeatedExcerptCount,
        brokenLinkCount,
        affectedCount: items.length,
        items,
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
