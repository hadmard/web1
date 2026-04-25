import { prisma } from "../lib/prisma";
import { validateInternalLinks } from "../lib/article-links";

async function main() {
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

  const report: Array<{
    articleId: string;
    title: string;
    slug: string;
    status: string;
    broken: Array<{ href: string; reason: string; field: string }>;
  }> = [];

  for (const row of rows) {
    const validation = await validateInternalLinks({
      html: row.content,
      keywordCsv: row.manualKeywords,
    });

    if (!validation.ok) {
      report.push({
        articleId: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        broken: validation.broken.map((item) => ({
          ...item,
          field: item.href.startsWith("/keyword/") ? "manualKeywords" : "content",
        })),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        scannedCount: rows.length,
        brokenCount: report.length,
        items: report,
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
