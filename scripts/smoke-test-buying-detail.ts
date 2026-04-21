import { prisma } from "../lib/prisma";

type Mode = "create" | "verify" | "cleanup" | "full";

type DetectionResult = {
  suspiciousUnicode: boolean;
  replacementChar: boolean;
  repeatedQuestion: boolean;
  htmlEntity: boolean;
  suspiciousSnippet: string[];
  replacementSnippet: string[];
  questionSnippet: string[];
  entitySnippet: string[];
};

const DEFAULT_SITE_URL = "https://cnzhengmu.com";
const TEST_TITLE = "整木选购测试文章（自动校验）";
const TEST_EXCERPT = "这是一条用于线上乱码与详情页路由校验的最小测试摘要，内容为正常中文。";
const TEST_CONTENT =
  "<p>这是一条用于线上 brands/buying 详情页验证的测试正文，包含正常中文，不包含乱码。</p><p>验证完成后将删除该数据。</p>";

function readArg(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function readMode(): Mode {
  const raw = readArg("mode").trim().toLowerCase();
  if (raw === "create" || raw === "verify" || raw === "cleanup") return raw;
  return "full";
}

function readSiteUrl() {
  return (readArg("site-url").trim() || process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function readId() {
  return readArg("id").trim();
}

function readSlug() {
  return readArg("slug").trim();
}

function readTimeoutSeconds() {
  const raw = Number(readArg("timeout") || "180");
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 600) : 180;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSlug() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `test-buying-${stamp}`;
}

function detectIssues(html: string): DetectionResult {
  const suspiciousMatches = Array.from(
    html.matchAll(/.{0,160}\\u(?!00(?:3[cCeE]|26|27|22|2f|60))[0-9a-fA-F]{4}.{0,180}/g),
  )
    .slice(0, 5)
    .map((match) => match[0]);
  const replacementMatches = Array.from(html.matchAll(/.{0,120}�.{0,120}/g))
    .slice(0, 5)
    .map((match) => match[0]);
  const questionMatches = Array.from(html.matchAll(/.{0,120}[?？]{3,}.{0,120}/g))
    .slice(0, 5)
    .map((match) => match[0]);
  const entityMatches = Array.from(html.matchAll(/.{0,120}&(?:amp;)?#(?:x[0-9A-Fa-f]+|\d+);.{0,120}/g))
    .slice(0, 5)
    .map((match) => match[0]);

  return {
    suspiciousUnicode: suspiciousMatches.length > 0,
    replacementChar: replacementMatches.length > 0,
    repeatedQuestion: questionMatches.length > 0,
    htmlEntity: entityMatches.length > 0,
    suspiciousSnippet: suspiciousMatches,
    replacementSnippet: replacementMatches,
    questionSnippet: questionMatches,
    entitySnippet: entityMatches,
  };
}

async function createArticle() {
  const now = new Date();
  const slug = buildSlug();
  const article = await prisma.article.create({
    data: {
      title: TEST_TITLE,
      slug,
      sourceType: "manual",
      source: "系统测试",
      displayAuthor: "Codex",
      excerpt: TEST_EXCERPT,
      content: TEST_CONTENT,
      categoryHref: "/brands/buying",
      subHref: "/brands/buying",
      status: "approved",
      publishedAt: now,
      keywords: "测试,整木选购",
      manualKeywords: "测试,整木选购",
      syncToMainSite: false,
      isPinned: false,
    },
    select: { id: true, slug: true, title: true, publishedAt: true },
  });

  console.log("Created test article:");
  console.log(JSON.stringify(article, null, 2));
  return article;
}

async function waitForBuyingList(siteUrl: string, slug: string, timeoutSeconds: number) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  const listUrl = `${siteUrl}/brands/buying`;

  while (Date.now() < deadline) {
    const response = await fetch(listUrl, { redirect: "follow" });
    const html = await response.text();
    if (html.includes(`/brands/buying/${slug}`)) {
      return { listUrl, detailUrl: `${siteUrl}/brands/buying/${slug}`, html };
    }
    console.log(`Waiting for buying list to show slug ${slug} ...`);
    await sleep(10_000);
  }

  return null;
}

async function verifyArticle(siteUrl: string, slug: string, timeoutSeconds: number) {
  const listed = await waitForBuyingList(siteUrl, slug, timeoutSeconds);
  if (!listed) {
    console.log(`LIST_FOUND=NO site=${siteUrl} slug=${slug}`);
    return null;
  }

  const detailResponse = await fetch(listed.detailUrl, { redirect: "follow" });
  const detailHtml = await detailResponse.text();
  const detailResult = detectIssues(detailHtml);

  console.log(`LIST_FOUND=YES url=${listed.listUrl}`);
  console.log(`DETAIL_URL=${listed.detailUrl}`);
  console.log(
    `SUSPICIOUS_UNICODE=${detailResult.suspiciousUnicode ? "YES" : "NO"} REPLACEMENT=${detailResult.replacementChar ? "YES" : "NO"} QUESTION_RUN=${detailResult.repeatedQuestion ? "YES" : "NO"} HTML_ENTITY=${detailResult.htmlEntity ? "YES" : "NO"}`,
  );
  if (detailResult.suspiciousSnippet.length > 0) console.log(`SUSPICIOUS_SNIPPET=${detailResult.suspiciousSnippet.join("\n---\n")}`);
  if (detailResult.replacementSnippet.length > 0) console.log(`REPLACEMENT_SNIPPET=${detailResult.replacementSnippet.join("\n---\n")}`);
  if (detailResult.questionSnippet.length > 0) console.log(`QUESTION_SNIPPET=${detailResult.questionSnippet.join("\n---\n")}`);
  if (detailResult.entitySnippet.length > 0) console.log(`ENTITY_SNIPPET=${detailResult.entitySnippet.join("\n---\n")}`);

  return detailResult;
}

async function cleanupArticle(id: string) {
  await prisma.article.delete({ where: { id } });
  console.log(`DELETED=${id}`);
}

async function main() {
  const mode = readMode();
  const siteUrl = readSiteUrl();
  const timeoutSeconds = readTimeoutSeconds();

  if (mode === "create") {
    await createArticle();
    return;
  }

  if (mode === "verify") {
    const slug = readSlug();
    if (!slug) {
      throw new Error("verify mode requires --slug");
    }
    await verifyArticle(siteUrl, slug, timeoutSeconds);
    return;
  }

  if (mode === "cleanup") {
    const id = readId();
    if (!id) {
      throw new Error("cleanup mode requires --id");
    }
    await cleanupArticle(id);
    return;
  }

  const created = await createArticle();
  try {
    await verifyArticle(siteUrl, created.slug, timeoutSeconds);
  } finally {
    await cleanupArticle(created.id);
  }
}

main()
  .catch((error) => {
    console.error("smoke-test-buying-detail failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
