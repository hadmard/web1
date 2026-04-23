import { prisma } from "../lib/prisma";
import { pushApprovedNewsToBaidu, submitUrlToBaidu } from "../lib/baidu-submit";

function isValidManualNewsUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://cnzhengmu.com" &&
      /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*-?$/.test(url.pathname) &&
      !/^\/news\/\d+(?:-[a-z])?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

async function pushRecentApprovedNews(limit: number) {
  const articles = await prisma.article.findMany({
    where: { status: "approved" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      categoryHref: true,
      subHref: true,
    },
  });

  for (const article of articles) {
    const result = await pushApprovedNewsToBaidu(article, { source: "manual_recent_push" });
    console.log(JSON.stringify(result));
  }
}

async function pushManualUrls(urls: string[]) {
  for (const url of urls) {
    if (!isValidManualNewsUrl(url)) {
      console.warn(
        JSON.stringify({
          pushed_url: url,
          success: null,
          remain: null,
          error: "invalid_manual_news_url",
        }),
      );
      continue;
    }

    const result = await submitUrlToBaidu(url);
    console.log(JSON.stringify(result));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const recentIndex = args.indexOf("--recent");

  if (recentIndex >= 0) {
    const rawLimit = args[recentIndex + 1] ?? "20";
    const limit = Math.max(1, Math.min(100, Number.parseInt(rawLimit, 10) || 20));
    await pushRecentApprovedNews(limit);
    return;
  }

  const urls = args.filter((item) => /^https?:\/\//.test(item));
  if (urls.length === 0) {
    console.error("Usage: ts-node --transpile-only -P scripts/tsconfig.scripts.json scripts/push-baidu.ts <url...> | --recent 20");
    process.exit(1);
  }

  await pushManualUrls(urls);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
