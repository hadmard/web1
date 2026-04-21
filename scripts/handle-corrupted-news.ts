import { prisma } from "../lib/prisma";

const TARGET_IDS = ["cmngvho270001gpbn2qdgxk7z", "cmngvidw80004gpbnlxox4bx9"] as const;

type Mode = "hide" | "delete";

function readArg(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function readMode(): Mode {
  const raw = readArg("mode").trim().toLowerCase();
  return raw === "delete" ? "delete" : "hide";
}

function shouldApply() {
  return process.argv.includes("--apply");
}

async function main() {
  const mode = readMode();
  const apply = shouldApply();

  const records = await prisma.article.findMany({
    where: { id: { in: [...TARGET_IDS] } },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      sourceType: true,
      generationBatchId: true,
      authorMemberId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (records.length === 0) {
    console.log("No target articles found.");
    return;
  }

  console.log(`Mode: ${mode}`);
  console.log(`Apply: ${apply ? "yes" : "no (dry-run)"}`);
  console.table(
    records.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      status: item.status,
      sourceType: item.sourceType,
      generationBatchId: item.generationBatchId,
      authorMemberId: item.authorMemberId,
      createdAt: item.createdAt.toISOString(),
    })),
  );

  if (!apply) {
    console.log("Dry-run finished. Re-run with --apply to execute.");
    return;
  }

  if (mode === "delete") {
    const deleted = await prisma.article.deleteMany({
      where: { id: { in: records.map((item) => item.id) } },
    });
    console.log(`Deleted ${deleted.count} corrupted news record(s).`);
    return;
  }

  const hidden = await prisma.article.updateMany({
    where: { id: { in: records.map((item) => item.id) } },
    data: {
      status: "rejected",
      isPinned: false,
      syncToMainSite: false,
      reviewNote: "历史脏数据已下线，待人工重录",
      reviewedAt: new Date(),
      publishedAt: null,
    },
  });
  console.log(`Hidden ${hidden.count} corrupted news record(s).`);
}

main()
  .catch((error) => {
    console.error("handle-corrupted-news failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
