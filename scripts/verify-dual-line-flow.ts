import { prisma } from "../lib/prisma";
import { pushApprovedNewsToBaidu, resolvePushableNewsUrl } from "../lib/baidu-submit";

async function main() {
  const id = process.argv[2];
  if (!id) {
    throw new Error("Missing article id");
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      status: "approved",
      publishedAt: new Date(),
      reviewedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      categoryHref: true,
      subHref: true,
      publishedAt: true,
    },
  });

  const resolved = resolvePushableNewsUrl(article);
  const pushResult = await pushApprovedNewsToBaidu(article, { source: "manual_verification" });
  const approvedVisible = await prisma.article.findMany({
    where: {
      slug: article.slug,
      status: "approved",
    },
    select: {
      slug: true,
      status: true,
      categoryHref: true,
      subHref: true,
      publishedAt: true,
    },
  });
  const sitemapEligible = await prisma.article.findMany({
    where: {
      slug: article.slug,
      status: "approved",
      publishedAt: { not: null },
    },
    select: {
      slug: true,
    },
  });
  const jobs = await prisma.$queryRawUnsafe<
    Array<{ article_id: string; status: string; source: string | null; pushed_at: Date | null; last_error: string | null }>
  >(`SELECT article_id, status, source, pushed_at, last_error FROM baidu_push_jobs WHERE article_id = '${article.id}'`);

  console.log(
    JSON.stringify(
      {
        article,
        resolved,
        pushResult,
        approvedVisible,
        sitemapEligible,
        jobs,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
