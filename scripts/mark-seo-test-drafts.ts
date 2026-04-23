import { PrismaClient } from "@prisma/client";

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

async function main() {
  const dateArg = readArg("date");
  if (!dateArg) {
    throw new Error("Missing required --date argument, for example --date 2026-04-23");
  }

  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
  const start = new Date(`${dateArg}T00:00:00+08:00`);
  const end = new Date(`${dateArg}T23:59:59.999+08:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid --date value: ${dateArg}`);
  }

  const prisma = new PrismaClient();

  try {
    const rows = await prisma.article.findMany({
      where: {
        source: "auto_dual_line_seo_generator",
        status: "pending",
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        generationBatchId: true,
        reviewNote: true,
        createdAt: true,
      },
    });

    const targets = rows.filter((row) => !(row.reviewNote || "").includes("testRun=true"));

    if (!dryRun && targets.length > 0) {
      for (const row of targets) {
        const nextReviewNote = `${row.reviewNote || "dual-line seo draft"} | trigger=manual_assumed | testRun=true | testMarkedAt=${new Date().toISOString()}`;
        await prisma.article.update({
          where: { id: row.id },
          data: { reviewNote: nextReviewNote },
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          date: dateArg,
          dryRun,
          matchedCount: rows.length,
          markedCount: targets.length,
          batches: Array.from(new Set(targets.map((row) => row.generationBatchId).filter(Boolean))),
          items: targets.map((row) => ({
            id: row.id,
            title: row.title,
            generationBatchId: row.generationBatchId,
            createdAt: row.createdAt.toISOString(),
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
