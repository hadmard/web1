import { PrismaClient } from "@prisma/client";

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

async function main() {
  const sinceArg = readArg("since");
  if (!sinceArg) {
    throw new Error("Missing required --since argument");
  }

  const since = new Date(sinceArg);
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since value: ${sinceArg}`);
  }

  const prisma = new PrismaClient();

  try {
    const latest = await prisma.article.findFirst({
      where: {
        source: { in: ["auto_seo_generator", "auto_dual_line_seo_generator"] },
        createdAt: { gte: since },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        generationBatchId: true,
      },
    });

    if (!latest?.generationBatchId) {
      console.log(
        JSON.stringify({
          generationBatchId: null,
          savedCount: 0,
          pendingCount: 0,
          items: [],
        }),
      );
      return;
    }

    const rows = await prisma.article.findMany({
      where: {
        generationBatchId: latest.generationBatchId,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        title: true,
        status: true,
      },
    });

    console.log(
      JSON.stringify({
        generationBatchId: latest.generationBatchId,
        savedCount: rows.length,
        pendingCount: rows.filter((row) => row.status === "pending").length,
        items: rows.slice(0, 5).map((row) => row.title),
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
