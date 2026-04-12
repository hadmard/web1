import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";

type SampleArticle = {
  id: string;
  slug: string;
  title: string;
  oldUrl: string;
  subHref: "/news/events" | "/news/tech";
  publishedAt: string;
};

type SyncItemReport = {
  article_id: string;
  slug: string;
  title: string;
  old_url: string;
  new_url: string;
  status: string;
  published_at: string | null;
  content_length: number;
  excerpt_length: number;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 CNZhengmuProdSampleSync/1.0";

const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    id: "cmnvklps7000013u916tao4d6",
    slug: "ju-shi-jiang-cheng-zhi-ling-zheng-zhuang-zhong-guo-fan-jia-ju-chuang-xin-lun-tan",
    title: "“聚势江城 智领整装”中国泛家居创新论坛在武汉召开",
    oldUrl: "https://jiu.cnzhengmu.com/news/qiye/129759.html",
    subHref: "/news/events",
    publishedAt: "2025-06-16T00:00:00.000Z",
  },
  {
    id: "cmnvklpsy000213u9vsob03t1",
    slug: "si-lu-qi-dian-she-ji-xin-zhang-2025-xi-an-dang-dai-she-ji-zhou-sheng-da-qi-mu",
    title: "丝路起点，设计新章！2025西安当代设计周盛大启幕！",
    oldUrl: "https://jiu.cnzhengmu.com/companynews/10665932-182579728.html",
    subHref: "/news/events",
    publishedAt: "2025-05-29T00:00:00.000Z",
  },
  {
    id: "cmnvklpta000413u98rkznhg0",
    slug: "ao-mu-zhi-neng-hu-yan-deng-shang-shi-yong-dong-ni-de-dong-tai-zi-ran-guang-da-za",
    title: "傲目智能护眼灯上市，用“懂你的动态自然光”打造护眼光环境",
    oldUrl: "https://jiu.cnzhengmu.com/news/qiye/129029.html",
    subHref: "/news/events",
    publishedAt: "2024-12-31T00:00:00.000Z",
  },
  {
    id: "cmnvklpzw001c13u9sdxs2v0a",
    slug: "20-wan-ren-ci-gong-fu-xi-bu-she-ji-kuang-huan-2025-xi-an-dang-dai-she-ji-zhou-yu",
    title: "20万+人次共赴西部设计狂欢！2025西安当代设计周圆满收官！",
    oldUrl: "https://jiu.cnzhengmu.com/companynews/10665932-182579618.html",
    subHref: "/news/events",
    publishedAt: "2025-05-28T00:00:00.000Z",
  },
  {
    id: "cmnvklq05001e13u92bfdv855",
    slug: "ke-ji-yin-ling-xiao-liang-ling-xian-an-ji-er-shang-yong-zhi-ji-xi-lie-xin-pin-fa",
    title: "科技引领销量领先，安吉尔商用“智极”系列新品发布会圆满举办",
    oldUrl: "https://jiu.cnzhengmu.com/companynews/10665932-182579062.html",
    subHref: "/news/events",
    publishedAt: "2025-04-29T00:00:00.000Z",
  },
  {
    id: "cmnvklq2y002013u90xc482z8",
    slug: "2025-nian-shi-jie-lin-mu-ye-da-hui-ji-2025-nian-guang-xi-guo-ji-lin-chan-pin-ji-",
    title: "2025年世界林木业大会暨2025年广西国际林产品及木制品展盛大举办",
    oldUrl: "https://jiu.cnzhengmu.com/news/shichang/130093.html",
    subHref: "/news/events",
    publishedAt: "2025-11-24T00:00:00.000Z",
  },
  {
    id: "cmnvklq4m002c13u9f6pfy3o5",
    slug: "ao-shi-mi-si-hei-ke-ji-tu-po-quan-shi-gao-shui-xiao-heng-jing-xi-tong-zhong-su-b",
    title: "A.O.史密斯黑科技突破：全时高水效+恒净系统，重塑\"杯杯纯净不费水\"净水新标杆",
    oldUrl: "https://jiu.cnzhengmu.com/companynews/10665932-182579200.html",
    subHref: "/news/events",
    publishedAt: "2025-05-15T00:00:00.000Z",
  },
  {
    id: "cmnvklq4w002e13u94bvq0t3s",
    slug: "ma-lai-xi-ya-guo-ji-jia-ju-zhan-zhun-bei-jiu-xu-wei-2025-nian-ya-zhou-cai-gou-ji",
    title: "马来西亚国际家具展准备就绪为2025年亚洲采购季掀开序幕",
    oldUrl: "https://jiu.cnzhengmu.com/news/qiye/129235.html",
    subHref: "/news/events",
    publishedAt: "2025-02-18T00:00:00.000Z",
  },
  {
    id: "cmnvklq5m002k13u9q0d9uioc",
    slug: "chun-zhan-xin-pian-shou-zhan-gao-jie-wu-han-zheng-zhuang-ding-zhi-jia-ju-zhan-yu",
    title: "春绽新篇，首展告捷！武汉整装定制家居展圆满闭幕",
    oldUrl: "https://jiu.cnzhengmu.com/news/qiye/129331.html",
    subHref: "/news/events",
    publishedAt: "2025-03-04T00:00:00.000Z",
  },
  {
    id: "cmnvklpwr000q13u9s930sw96",
    slug: "ye-ji-ni-liu-er-shang-san-ke-shu-jing-li-run-da-zhang-chao-90-fang-shui-cai-liao",
    title: "业绩逆流而上，三棵树净利润大涨超90%，防水材料成增长引擎！",
    oldUrl: "https://jiu.cnzhengmu.com/news/hangye/130005.html",
    subHref: "/news/tech",
    publishedAt: "2025-09-17T00:00:00.000Z",
  },
];

function readArg(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
  );
}

function previewText(input: string, max = 200) {
  const plain = stripTags(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}

function buildParagraphHtml(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p>${text}</p>`;
  }

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n");
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("utf8");
}

function extractPublishedAt(html: string, fallback: string) {
  const match =
    html.match(/(20\d{2}-\d{1,2}-\d{1,2})(?:\s+\d{1,2}:\d{2}:\d{2})?/) ??
    html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i);

  const raw = normalizeWhitespace(match?.[1] ?? fallback);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

function extractContentHtml(html: string) {
  const patterns = [
    /<div class="content text-indent[\s\S]*?>([\s\S]*?)<\/div>\s*<div class="clearfix">/i,
    /<div class="content[\s\S]*?>([\s\S]*?)<\/div>\s*<div class="clearfix">/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const content = (match?.[1] ?? "").trim();
    if (content) return content;
  }

  return "";
}

function extractImage(html: string) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || null;
}

function buildContentHash(title: string, contentText: string) {
  return createHash("sha256")
    .update(normalizeWhitespace(`${title}\n${contentText}`), "utf8")
    .digest("hex");
}

function resolveDatabaseTarget() {
  const envCandidates = [
    process.env.DATABASE_URL?.trim(),
    tryReadDatabaseUrl(resolve(process.cwd(), ".env.production")),
    tryReadDatabaseUrl(resolve(process.cwd(), ".env")),
  ].filter(Boolean) as string[];

  const raw = envCandidates[0] ?? "";
  if (!raw) {
    return { source: "not_found", host: "", port: "", database: "" };
  }

  const sanitized = raw.replace(/^postgres(ql)?:\/\//, "http://");
  try {
    const parsed = new URL(sanitized);
    return {
      source: raw === process.env.DATABASE_URL?.trim() ? "env" : "env_file",
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, "").split("?")[0],
    };
  } catch {
    return { source: "parse_failed", host: "", port: "", database: "" };
  }
}

function tryReadDatabaseUrl(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(/^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

async function syncOne(sample: SampleArticle): Promise<SyncItemReport> {
  const slugConflict = await prisma.article.findUnique({
    where: { slug: sample.slug },
    select: { id: true },
  });

  if (slugConflict && slugConflict.id !== sample.id) {
    throw new Error(`slug conflict: ${sample.slug} already belongs to ${slugConflict.id}`);
  }

  const html = await fetchHtml(sample.oldUrl);
  const rawContentHtml = extractContentHtml(html);
  const contentText = stripTags(rawContentHtml);

  if (!contentText || contentText.length < 80) {
    throw new Error(`content extraction failed: ${sample.oldUrl}`);
  }

  const normalizedContent =
    normalizeRichTextField(rawContentHtml) ??
    normalizeRichTextField(buildParagraphHtml(contentText)) ??
    buildParagraphHtml(contentText);
  const publishedAt = extractPublishedAt(html, sample.publishedAt);
  const excerpt = previewText(contentText, 200);
  const coverImage = extractImage(rawContentHtml);
  const now = new Date();

  const article = await prisma.article.upsert({
    where: { id: sample.id },
    update: {
      slug: sample.slug,
      title: sample.title,
      source: "中华整木网旧站",
      sourceUrl: sample.oldUrl,
      excerpt,
      content: normalizedContent,
      coverImage,
      subHref: sample.subHref,
      categoryHref: "/news",
      publishedAt,
      status: "approved",
      contentHash: buildContentHash(sample.title, contentText),
      reviewedAt: now,
      reviewNote: "样板文章线上同步",
    },
    create: {
      id: sample.id,
      slug: sample.slug,
      title: sample.title,
      source: "中华整木网旧站",
      sourceUrl: sample.oldUrl,
      excerpt,
      content: normalizedContent,
      coverImage,
      subHref: sample.subHref,
      categoryHref: "/news",
      publishedAt,
      status: "approved",
      contentHash: buildContentHash(sample.title, contentText),
      reviewedAt: now,
      reviewNote: "样板文章线上同步",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      content: true,
      excerpt: true,
      sourceUrl: true,
    },
  });

  return {
    article_id: article.id,
    slug: article.slug,
    title: article.title,
    old_url: article.sourceUrl ?? sample.oldUrl,
    new_url: `https://cnzhengmu.com/news/${article.slug}`,
    status: article.status,
    published_at: article.publishedAt?.toISOString() ?? null,
    content_length: stripTags(article.content).length,
    excerpt_length: (article.excerpt ?? "").length,
  };
}

async function main() {
  const reportArg = readArg("report");
  const reportPath = reportArg ? resolve(reportArg) : resolve(process.cwd(), "custom", "reports", `prod-sample-news-sync-${Date.now()}.json`);
  const dbTarget = resolveDatabaseTarget();
  const items: SyncItemReport[] = [];

  for (const sample of SAMPLE_ARTICLES) {
    items.push(await syncOne(sample));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    databaseTarget: dbTarget,
    sampleCount: SAMPLE_ARTICLES.length,
    items,
  };

  writeFileSync(reportPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
