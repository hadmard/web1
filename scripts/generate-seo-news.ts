import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";
import { generateUniqueArticleSlug } from "../lib/slug";
import { buildSeoContentHash, findSeoLeadDuplicateReason } from "../lib/seo-dedup";
import { SEO_CORE_INTERNAL_LINKS } from "../lib/seo-keyword-seeds";
import { pickSeoTopicsForGeneration, type SeoTopicCandidate, type SeoTopicSelectionStats } from "../lib/seo-topic-generator";

type GeneratedSeoArticle = {
  title: string;
  excerpt: string;
  keywords: string;
  content: string;
  slug: string;
  internalLinks: Array<{ title: string; slug: string; href: string }>;
  status: "pending";
  publishedAt: Date | null;
  categoryHref: "/news";
  subHref: "/news/trends";
  sourceType: "ai_generated";
  source: "auto_seo_generator";
  generationBatchId: string;
  keywordSeed: string;
  keywordIntent: string;
  contentHash: string;
  audience: "c_end" | "b_end";
};

type ExistingNewsRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  sourceUrl: string | null;
};

type GeneratorRunStats = SeoTopicSelectionStats & {
  generatedCount: number;
  leadFilterCount: number;
  leadFilterRelaxed: boolean;
  selectionMode: "strict" | "relaxed";
};

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function stripHtml(input: string) {
  return String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function assertAutoSeoWritableTarget(type: "article" | "category" | "tag" | "dictionary" | "brand" | "enterprise") {
  if (type === "category" || type === "tag") {
    throw new Error(`SEO auto generation cannot write ${type}`);
  }
  if (type !== "article") {
    throw new Error(`SEO auto generation cannot write ${type}`);
  }
}

function buildArticleKeywords(topic: SeoTopicCandidate) {
  const words = unique(
    [
      topic.keywordSeed,
      topic.audience === "c_end" ? "整木定制" : "",
      topic.title.includes("预算") ? "整木定制预算" : "",
      topic.title.includes("多少钱") ? "整木定制价格" : "",
      topic.title.includes("板材") || topic.title.includes("多层板") ? "整木板材" : "",
      topic.title.includes("工厂") ? "整木工厂获客" : "",
      topic.title.includes("门店") ? "整木门店成交" : "",
      topic.title.includes("询盘") ? "整木工厂询盘" : "",
    ].filter(Boolean),
  );

  return words.slice(0, 5);
}

function pickSubHref(): GeneratedSeoArticle["subHref"] {
  return "/news/trends";
}

function buildInternalLinks(topic: SeoTopicCandidate) {
  const filtered = SEO_CORE_INTERNAL_LINKS.filter((item) => !topic.title.includes(item.keyword));
  const selected = (
    filtered.length >= 2
      ? filtered
      : SEO_CORE_INTERNAL_LINKS.filter((item) => !topic.title.includes(item.title))
  ).slice(0, 3);

  return selected.map((item) => ({
      title: item.title,
      slug: item.slug,
      href: `/news/${item.slug}`,
    }));
}

function paragraph(text: string) {
  return `<p>${text}</p>`;
}

function heading(text: string) {
  return `<h2>${text}</h2>`;
}

function linkSentence(text: string, href: string, title: string) {
  return paragraph(`${text}<a href="${href}">${title}</a>。`);
}

function buildConsumerBody(topic: SeoTopicCandidate, links: ReturnType<typeof buildInternalLinks>) {
  const isPrice = topic.title.includes("多少钱") || topic.title.includes("预算") || topic.title.includes("报价");
  const isMaterial = topic.title.includes("实木") || topic.title.includes("多层板") || topic.title.includes("板材");

  return [
    paragraph(
      isPrice
        ? "整木定制多少钱一平没有统一答案，很多业主真正想问的是100平要花多少钱、10万够不够、预算该怎么分配才不容易超支。判断价格时，先看空间范围，再看板材、工艺和安装复杂度，比直接问单价更有参考价值。"
        : isMaterial
          ? "整木定制选实木还是多层板，关键不只是哪个更贵，而是你的预算、空间稳定性要求和后期使用习惯更适合哪一种。很多家庭一开始只盯材料名称，最后反而忽略了基层结构和交付细节。"
          : "整木定制值不值，往往不是一句好或不好就能说清。真正影响体验的，是预算边界、设计落地、材料选择和施工周期有没有提前想明白。",
    ),
    heading(isPrice ? "先把预算问题拆开，不要只盯单价" : "先搞清自己最在意的是什么"),
    paragraph(
      isPrice
        ? "不少业主一开口就问整木定制多少钱一平，但实际报价很少只按单一面积计算。墙板、木门、柜体、顶面造型、五金、油漆工艺和现场安装，都会让价格拉开差距。更稳妥的做法，是先确认哪些空间必须做，哪些项目可以后置，再去拆预算。"
        : isMaterial
          ? "如果你更在意天然纹理和触感，实木更容易打动人；如果你更在意稳定性、性价比和后期维护，多层板通常更好控制。问题在于，很多门店只讲概念，不讲结构和工艺，业主听完还是不知道该怎么选。"
          : "整木定制更适合看重统一感、木作细节和个性化落地的家庭。如果只是为了解决基础收纳，未必要一步到位做整木；但如果你在意墙门柜一体化和长期居住体验，就要把预算、设计和交付一起放到决策里。",
    ),
    heading(isMaterial ? "材料判断，别只看名字" : "报价差异，往往出在范围和工艺"),
    paragraph(
      isMaterial
        ? "实木、多层板、木皮饰面和漆面处理，看起来只是材料区别，实际会影响稳定性、气味控制、变形风险和预算。真正该问的，不只是是不是实木，还包括基层怎么做、封边怎么处理、背板厚度是多少、现场安装后能不能稳。"
        : "同样写着整木定制，不同门店报价差出不少并不奇怪。常见原因不是谁故意报高，而是项目边界不同。有的只含基础柜体，有的把护墙板、门套、木门、五金和安装都算进去。比较报价前，先看清清单里到底含了什么。",
    ),
    linkSentence(
      links[0]?.title.includes("预算")
        ? "如果你还不清楚整木定制的价格区间，可以参考"
        : SEO_CORE_INTERNAL_LINKS[0].prompt,
      links[0]?.href ?? "/news/zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
      links[0]?.title ?? SEO_CORE_INTERNAL_LINKS[0].title,
    ),
    heading("真正容易出问题的，通常是设计和交付"),
    paragraph(
      "很多业主后悔的，不是最初单价高了几百，而是方案图和现场落地不一致、尺寸返工、安装拖期，最后入住时间被打乱。看品牌或门店时，最好要求对方拿出同类户型案例、完整节点图和交付排期。能把过程讲清楚的团队，通常比只会讲风格更靠谱。",
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[1].prompt,
      links[1]?.href ?? "/news/zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
      links[1]?.title ?? SEO_CORE_INTERNAL_LINKS[1].title,
    ),
    heading("总结"),
    paragraph(
      isPrice
        ? "整木定制价格没有标准答案，但预算逻辑是可以提前看清的。先分清空间范围、材料档次和施工复杂度，再去比品牌和报价，通常比直接比单价更不容易踩坑。"
        : isMaterial
          ? "整木定制选实木还是多层板，没有绝对标准，关键是你的预算、稳定性要求和使用场景是否匹配。只要把结构、工艺和交付一起看，选择就会清晰很多。"
          : "整木定制值不值，核心不在于跟风，而在于你的需求和预算有没有对上。先把最重要的空间、材料和工期想明白，再做决定，整体出错率会低很多。",
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[2].prompt,
      links[2]?.href ?? "/news/zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
      links[2]?.title ?? SEO_CORE_INTERNAL_LINKS[2].title,
    ),
  ].join("");
}

function buildBusinessBody(topic: SeoTopicCandidate, links: ReturnType<typeof buildInternalLinks>) {
  const isFactory = topic.title.includes("工厂");

  return [
    paragraph(
      isFactory
        ? "整木工厂怎么接单，很多团队第一反应是做网站、投广告、发案例，但最后还是没有客户。问题通常不在渠道本身，而在网站内容没有回答客户正在搜索的问题，导致流量来了也留不下询盘。"
        : "整木门店转化率低，很多时候不是客户太少，而是客户在到店前没有建立起足够信任。预算、材料、案例和交付这些问题如果在线上讲不清，门店后续成交就会变得很被动。",
    ),
    heading(isFactory ? "先看客户会不会留下来" : "先看客户为什么迟迟不下决定"),
    paragraph(
      isFactory
        ? "不少工厂网站首页写满企业介绍和实力展示，却没有直面客户真正会搜的问题。比如报价怎么构成、不同板材怎么选、工期多久、案例适合什么户型，这些才是客户进入网站后最容易决定要不要继续咨询的内容。"
        : "客户到店前往往已经比较过价格、材料和案例，如果网站内容只是活动海报或品牌口号，客户就很难形成明确预期。等到线下沟通时，销售只能从头解释，成交节奏自然会被拖慢。",
    ),
    heading(isFactory ? "网站内容要服务询盘，不是只服务展示" : "报价、案例和预约动作必须连起来"),
    paragraph(
      isFactory
        ? "一篇内容最好只回答一个明确问题，然后自然引导到案例、报价思路或咨询入口。这样做的意义，不只是拿搜索流量，更是在客户第一次接触时就把筛选和教育做在前面。询盘质量高不高，很多时候就是在这一步拉开的。"
        : "很多门店转化低，不是不会谈单，而是客户在看完案例后没有下一步动作，在看到报价前也没有建立预期。内容要把预算逻辑、案例对照和预约动作串起来，客户才知道下一步该做什么。",
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[0].prompt,
      links[0]?.href ?? "/news/zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
      links[0]?.title ?? SEO_CORE_INTERNAL_LINKS[0].title,
    ),
    heading(isFactory ? "先覆盖高意图问题，再做品牌露出" : "先把门店优势说具体，才更容易成交"),
    paragraph(
      isFactory
        ? "对工厂来说，最先应该布局的，不是空泛行业稿，而是“多少钱、怎么选、工期多久、材料怎么判断”这类高意图问题。因为真正能带来线索的，通常不是宣传口号，而是解决客户决策疑问的内容。"
        : "对门店来说，应该把同城案例、主推材质、适合户型和交付周期写得更具体。客户越能在内容里看到真实场景，越容易提前建立信任，留资和预约的概率也会更高。",
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[1].prompt,
      links[1]?.href ?? "/news/zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
      links[1]?.title ?? SEO_CORE_INTERNAL_LINKS[1].title,
    ),
    heading("总结"),
    paragraph(
      isFactory
        ? "整木工厂想通过网站拿客户，关键不是内容发得多，而是每篇内容都能对应一个明确搜索意图，并把客户自然带到询盘动作上。先把高意图问题写透，线索质量通常会比单纯投广告更稳。"
        : "整木门店要提升成交率，不能只盯线下话术，更要把线上内容做成信任前置工具。客户在网站上先看懂预算、材料和案例，到店之后才更容易进入成交。",
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[2].prompt,
      links[2]?.href ?? "/news/zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
      links[2]?.title ?? SEO_CORE_INTERNAL_LINKS[2].title,
    ),
  ].join("");
}

function buildExcerpt(topic: SeoTopicCandidate) {
  if (topic.title.includes("多少钱")) {
    return "整木定制多少钱一平没有统一答案，很多业主真正关心的是100平要花多少钱、10万够不够、预算怎么分配才不容易超支。本文把整木定制价格区间和预算逻辑一次讲清。";
  }
  if (topic.title.includes("实木") || topic.title.includes("多层板")) {
    return "整木定制选实木还是多层板，很多人一开始只看材料名字，最后却在预算、稳定性和环保上选偏了。本文重点讲清两类常见板材怎么判断、分别适合什么家庭。";
  }
  if (topic.title.includes("工厂")) {
    return "整木工厂怎么接单，很多团队做了网站却一直没有客户，核心问题往往不是没流量，而是内容没有对上客户搜索意图。本文重点讲清工厂网站该先布局哪些内容，才更容易拿到询盘。";
  }
  if (topic.title.includes("门店")) {
    return "整木门店转化率低，很多时候不是客户太少，而是预算、案例和交付逻辑没有在线上提前讲清。本文重点拆解门店内容怎么布局，才能让客户更愿意留资和到店。";
  }

  return `${topic.keywordSeed}不是一句好不好就能说清，很多问题都卡在预算、材料和交付判断上。本文重点把这类问题拆开讲清，帮助你更快做决定。`.slice(0, 156);
}

function buildArticle(topic: SeoTopicCandidate, batchId: string): GeneratedSeoArticle {
  const internalLinks = buildInternalLinks(topic);
  const content =
    topic.audience === "b_end" ? buildBusinessBody(topic, internalLinks) : buildConsumerBody(topic, internalLinks);
  const normalizedContent = normalizeRichTextField(content) ?? content;
  const excerpt = buildExcerpt(topic);
  const keywords = buildArticleKeywords(topic).join(",");

  return {
    title: topic.title,
    excerpt,
    keywords,
    content: normalizedContent,
    slug: "",
    internalLinks,
    status: "pending",
    publishedAt: null,
    categoryHref: "/news",
    subHref: pickSubHref(),
    sourceType: "ai_generated",
    source: "auto_seo_generator",
    generationBatchId: batchId,
    keywordSeed: topic.keywordSeed,
    keywordIntent: topic.keywordIntent,
    contentHash: buildSeoContentHash(topic.title, normalizedContent),
    audience: topic.audience,
  };
}

async function loadExistingNewsRows(): Promise<ExistingNewsRow[]> {
  return prisma.article.findMany({
    where: { OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 600,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      sourceUrl: true,
    },
  });
}

async function persistGeneratedArticles(articles: GeneratedSeoArticle[]) {
  const saved = [];
  for (const article of articles) {
    assertAutoSeoWritableTarget("article");
    const slug = await generateUniqueArticleSlug(article.title);
    const record = await prisma.article.create({
      data: {
        title: article.title,
        slug,
        sourceType: article.sourceType,
        source: article.source,
        generationBatchId: article.generationBatchId,
        keywordSeed: article.keywordSeed,
        keywordIntent: article.keywordIntent,
        excerpt: article.excerpt,
        content: article.content,
        contentHash: article.contentHash,
        categoryHref: article.categoryHref,
        subHref: article.subHref,
        status: "pending",
        publishedAt: null,
        manualKeywords: article.keywords,
        reviewNote: `SEO自动生成草稿；批次 ${article.generationBatchId}；种子词 ${article.keywordSeed}；意图 ${article.keywordIntent}`,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        categoryHref: true,
        subHref: true,
      },
    });

    saved.push({ ...record, excerpt: article.excerpt, keywords: article.keywords, audience: article.audience });
  }

  return saved;
}

async function main() {
  if (process.env.SEO_NEWS_AUTOGEN_ENABLED !== "true") {
    throw new Error("SEO news generation is temporarily disabled");
  }
  const count = Math.max(1, Math.min(5, Number.parseInt(readArg("count") || "3", 10) || 3));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
  const batchId = `seo-${new Date().toISOString().slice(0, 10)}-${createHash("md5").update(String(Date.now())).digest("hex").slice(0, 6)}`;

  const [{ picked, candidates, stats, selectionMode }, existingArticles] = await Promise.all([
    pickSeoTopicsForGeneration(count),
    loadExistingNewsRows(),
  ]);

  const generated: GeneratedSeoArticle[] = [];
  let leadFilterCount = 0;
  let leadFilterRelaxed = false;
  for (const topic of picked) {
    const article = buildArticle(topic, batchId);
    const leadDupReason = findSeoLeadDuplicateReason(article.content, existingArticles, { similarityThreshold: 0.992 });
    if (leadDupReason) continue;
    article.slug = await generateUniqueArticleSlug(article.title);
    generated.push(article);
    if (generated.length >= count) break;
  }

  if (generated.length < picked.length) {
    leadFilterCount = picked.length - generated.length;
  }

  if (generated.length < Math.min(2, count)) {
    leadFilterRelaxed = true;
    for (const topic of picked) {
      if (generated.length >= count) break;
      if (generated.some((item) => item.keywordSeed === topic.keywordSeed && item.keywordIntent === topic.keywordIntent)) {
        continue;
      }

      const article = buildArticle(topic, batchId);
      article.slug = await generateUniqueArticleSlug(article.title);
      generated.push(article);
    }
  }

  const runStats: GeneratorRunStats = {
    ...stats,
    generatedCount: generated.length,
    leadFilterCount,
    leadFilterRelaxed,
    selectionMode,
  };

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          generationBatchId: batchId,
          candidateCount: candidates.length,
          stats: runStats,
          generatedCount: generated.length,
          items: generated.map((item) => ({
            title: item.title,
            excerpt: item.excerpt,
            keywords: item.keywords,
            slug: item.slug,
            status: item.status,
            categoryHref: item.categoryHref,
            subHref: item.subHref,
            keywordSeed: item.keywordSeed,
            keywordIntent: item.keywordIntent,
            audience: item.audience,
            internalLinks: item.internalLinks,
            content: item.content,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const saved = await persistGeneratedArticles(generated);
  console.log(
    JSON.stringify(
      {
        dryRun: false,
        generationBatchId: batchId,
        requestedCount: count,
        stats: runStats,
        generatedCount: generated.length,
        savedCount: saved.length,
        status: "pending",
        items: saved,
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
