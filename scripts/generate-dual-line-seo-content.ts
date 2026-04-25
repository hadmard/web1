import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";
import { assertNoDirtyText } from "../lib/article-input-guard";
import { buildCanonicalNewsHref, buildSeoStaticInternalLinks, resolvePublishedInternalLinks, validateInternalLinks } from "../lib/article-links";
import { evaluateSeoArticleQuality, type SeoFaqPair } from "../lib/seo-article-quality";
import { buildSeoContentHash, findSeoLeadDuplicateReason } from "../lib/seo-dedup";
import {
  DEFAULT_SEO_GENERATION_COUNT,
  SEO_APPROVED_DEFAULT,
  SEO_AUTOGEN_SOURCE,
  SEO_LINE_SEEDS,
  type SeoContentLine,
  type SeoLineSeedConfig,
} from "../lib/seo-keyword-seeds";
import { pickSeoTopicsForGeneration, type SeoTopicCandidate } from "../lib/seo-topic-generator";
import { generateUniqueArticleSlug, slugify } from "../lib/slug";

type TriggerSource = "manual" | "cron" | "dry_run";

type TopicLike = Partial<SeoTopicCandidate> & {
  title: string;
  keywordSeed?: string;
  keywordIntent?: string;
  contentLine?: SeoContentLine;
  themeLabel?: string;
  entityLabel?: string;
  sectionLabel?: string;
  categoryLabel?: string;
  subCategoryLabel?: string;
  categoryHref?: string;
  subHref?: string;
};

type GeneratedSeoArticle = {
  title: string;
  excerpt: string;
  keywords: string;
  content: string;
  slug: string;
  internalLinks: Array<{ title: string; href: string; anchorText: string }>;
  status: "pending";
  publishedAt: null;
  sourceType: "ai_generated";
  source: typeof SEO_AUTOGEN_SOURCE;
  generationBatchId: string;
  keywordSeed: string;
  keywordIntent: string;
  answerSummary: string;
  conceptSummary: string;
  applicableScenarios: string;
  faqPairs: SeoFaqPair[];
  keyFacts: string[];
  entityTerms: string[];
  claimCheckHints: string[];
  contentLine: SeoContentLine;
  section: string;
  category: string;
  subCategory: string;
  categoryHref: string;
  subHref: string;
  contentHash: string;
  triggerSource: TriggerSource;
  qualityReport: ReturnType<typeof evaluateSeoArticleQuality>;
};

function readArg(name: string) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function boolArg(name: string, fallback: boolean) {
  const value = readArg(name);
  if (!value) return fallback;
  return value === "true";
}

function loadLocalEnvIfNeeded() {
  const envFiles = [resolve(process.cwd(), ".env.production"), resolve(process.cwd(), ".env")];
  for (const filePath of envFiles) {
    try {
      const content = readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) continue;
        const key = trimmed.slice(0, separatorIndex).trim();
        if (!key || process.env[key]) continue;
        const rawValue = trimmed.slice(separatorIndex + 1).trim();
        process.env[key] =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
      }
      break;
    } catch {
      continue;
    }
  }
}

function p(text: string) {
  return `<p>${text}</p>`;
}

function h2(text: string) {
  return `<h2>${text}</h2>`;
}

function h3(text: string) {
  return `<h3>${text}</h3>`;
}

function ol(items: string[]) {
  return `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function inferContentLine(title: string): SeoContentLine {
  if (/报价|预算|选购|验收|工期|合同/.test(title)) return "buying";
  if (/官网|案例|FAQ|产品页|脚本|内容布局|搜索/.test(title)) return "tech";
  return "trend";
}

function getLineConfig(line: SeoContentLine): SeoLineSeedConfig {
  return SEO_LINE_SEEDS[line];
}

function inferThemeLabel(title: string) {
  if (title.includes("整木门店")) return "整木门店";
  if (title.includes("整木工厂")) return "整木工厂";
  if (title.includes("整木行业")) return "整木行业";
  if (title.includes("全屋定制")) return "全屋定制";
  return "整木行业";
}

function inferEntityLabel(title: string, line: SeoContentLine) {
  if (/AI/.test(title) && /推广/.test(title)) return "AI推广";
  if (/AI/.test(title) && /官网/.test(title)) return "AI官网内容";
  if (/AI/.test(title) && /案例/.test(title)) return "AI案例整理";
  if (line === "buying") return "整木选购";
  if (line === "tech") return "官网内容";
  return "线上获客";
}

function inferPrimaryKeyword(title: string, entityLabel: string) {
  if (/AI推广/.test(title)) return "AI推广";
  if (/线上获客/.test(title)) return "线上获客";
  if (/官网内容/.test(title)) return "官网内容";
  return entityLabel;
}

function inferKeywordIntent(title: string) {
  if (/为什么/.test(title)) return "为什么开始重视";
  if (/如何/.test(title)) return "如何落地";
  if (/是否/.test(title)) return "如何判断";
  return "核心判断";
}

function buildCompactSeoSlug(title: string, primaryKeyword: string) {
  const source = `${title} ${primaryKeyword}`;
  const tokenMap: Array<[RegExp, string]> = [
    [/整木门店/g, "zhengmu-store"],
    [/整木工厂/g, "zhengmu-factory"],
    [/整木行业/g, "zhengmu-industry"],
    [/全屋定制/g, "whole-house-custom"],
    [/原木定制/g, "solid-wood-custom"],
    [/AI推广/g, "ai-marketing"],
    [/AI官网内容/g, "ai-website-content"],
    [/AI案例整理/g, "ai-case-library"],
    [/线上获客/g, "online-leads"],
    [/官网内容/g, "website-content"],
    [/案例整理/g, "case-library"],
    [/为什么开始重视/g, "why-focus-on"],
    [/为什么/g, "why"],
    [/如何/g, "how-to"],
  ];

  let normalized = source;
  for (const [pattern, replacement] of tokenMap) {
    normalized = normalized.replace(pattern, ` ${replacement} `);
  }

  const compact = unique(
    normalized
      .split(/[^a-zA-Z0-9-]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .filter((item) => !["de", "le", "zhe", "do", "shen", "me", "kai", "shi", "hen", "duo"].includes(item)),
  )
    .filter((item, index, list) => !(item === "ai" && list.includes("ai-marketing")))
    .join("-");

  const fallback = slugify(title);
  const cleaned = (compact || fallback || "seo-article")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return cleaned || "seo-article";
}

function inferTopicFromTitle(title: string): SeoTopicCandidate {
  const contentLine = inferContentLine(title);
  const config = getLineConfig(contentLine);
  const themeLabel = inferThemeLabel(title);
  const entityLabel = inferEntityLabel(title, contentLine);
  const keywordIntent = inferKeywordIntent(title);

  return {
    title,
    slug: buildCompactSeoSlug(title, entityLabel),
    keywordSeed: entityLabel,
    keywordIntent,
    contentLine,
    sectionLabel: config.sectionLabel,
    categoryLabel: config.categoryLabel,
    subCategoryLabel: config.subCategoryLabel,
    categoryHref: config.categoryHref,
    subHref: config.subHref,
    themeLabel,
    entityLabel,
    patternKey: "manual-topic",
    intentScore: 100,
    businessScore: 100,
    extractabilityScore: 100,
    entityScore: 100,
    dupRiskScore: 0,
    titlePatternDiversityScore: 100,
    suffixDupRiskScore: 0,
    totalScore: 100,
    dedupReason: null,
  };
}

function normalizeTopic(input: TopicLike): SeoTopicCandidate {
  const inferred = inferTopicFromTitle(input.title);
  return {
    ...inferred,
    ...input,
    slug: input.slug?.trim() || inferred.slug,
    keywordSeed: input.keywordSeed?.trim() || inferred.keywordSeed,
    keywordIntent: input.keywordIntent?.trim() || inferred.keywordIntent,
    contentLine: input.contentLine || inferred.contentLine,
    themeLabel: input.themeLabel?.trim() || inferred.themeLabel,
    entityLabel: input.entityLabel?.trim() || inferred.entityLabel,
    sectionLabel: input.sectionLabel?.trim() || inferred.sectionLabel,
    categoryLabel: input.categoryLabel?.trim() || inferred.categoryLabel,
    subCategoryLabel: input.subCategoryLabel?.trim() || inferred.subCategoryLabel,
    categoryHref: input.categoryHref?.trim() || inferred.categoryHref,
    subHref: input.subHref?.trim() || inferred.subHref,
  };
}

function buildKeywords(topic: SeoTopicCandidate) {
  const candidates =
    topic.contentLine === "buying"
      ? [topic.themeLabel, "整木选购", "预算控制", "工艺判断", "交付验收"]
      : topic.contentLine === "tech"
        ? [topic.themeLabel, topic.entityLabel, "官网内容", "案例整理", "FAQ沉淀"]
        : [topic.themeLabel, topic.entityLabel, "线上获客", "官网内容", "案例整理"];

  return unique(candidates).slice(0, 5).join("、");
}

function buildFaqPairs(topic: SeoTopicCandidate): SeoFaqPair[] {
  if (/AI/.test(topic.title)) {
    return [
      {
        q: "整木门店为什么不再把 AI 当成单纯写文工具？",
        a: "因为整木门店真正缺的不是一句文案，而是案例整理、官网内容更新、客户常见问题沉淀和短视频脚本初稿这些可持续复用的内容资产。",
      },
      {
        q: "这套方法最适合先用在哪些环节？",
        a: "最适合先用于案例整理、官网内容更新、FAQ 沉淀、小红书和抖音脚本初稿，以及百度搜索入口所需的专题内容整理。",
      },
      {
        q: "哪些场景不适合直接交给 AI？",
        a: "报价、工艺承诺、交付周期判断、设计细节确认和高端客户的一对一方案决策，都不适合完全交给 AI 自动输出。",
      },
      {
        q: "这样做会不会让内容变得空泛？",
        a: "会，所以前提是先整理真实项目、材质、工艺、交付节点和客户问题，再用统一模板和人工审核保证表达不跑偏。",
      },
      {
        q: "整木工厂和整木门店都适合同样的 AI 推广路径吗？",
        a: "方向相同，但门店更偏向线上获客与转化表达，工厂更偏向工艺优势、案例归档和官网资料体系。",
      },
    ];
  }

  if (topic.contentLine === "buying") {
    return [
      { q: "整木选购最容易踩坑的点是什么？", a: "最容易踩坑的是把注意力只放在单价，而忽略材质边界、工艺差异、增项规则和交付验收标准。" },
      { q: "为什么报价差距会很大？", a: "因为木门、护墙板、柜体、楼梯和背景墙的材质、做法、五金和安装方式不同，最终成本差异会被不断放大。" },
      { q: "什么时候应该更看重工厂能力？", a: "当项目涉及别墅大宅、复杂收口、楼梯背景墙联动和高端客户交付时，更要看工厂的深化和交付能力。" },
      { q: "验收时先看什么？", a: "先看拼缝、平整度、封边、五金安装、现场保护和与设计稿的一致性，再谈表面观感。" },
      { q: "预算不高还能做整木吗？", a: "可以，但要优先级明确，把重点空间和重点部位先做好，不要在所有部位同时追求高配置。" },
    ];
  }

  return [
    { q: "为什么以前靠熟人和转介绍也能接单，现在却不够用了？", a: "因为客户的预判动作前移了，很多高端客户会先搜官网内容、案例整理和行业问题，再决定要不要继续沟通。" },
    { q: "官网内容为什么会影响整木门店的成交效率？", a: "官网不只是展示页面，它承担了初步筛选、降低重复解释和建立专业信任的作用。" },
    { q: "案例整理为什么会成为线上获客的核心资产？", a: "因为案例最能把木门、护墙板、柜体、楼梯和背景墙这些真实交付内容讲清楚，也最容易被百度搜索和 AI 搜索引用。" },
    { q: "小红书、抖音和官网内容应该怎么配合？", a: "短内容负责吸引和触达，官网负责沉淀和解释，案例页负责建立信任，三者配合才会形成稳定获客链路。" },
    { q: "高端客户最在意哪类线上信息？", a: "高端客户更在意真实案例、工艺判断、风险边界、设计师协同方式和交付经验，而不是空泛宣传。" },
  ];
}

function buildInternalLinkSentence(target: { href: string; anchorText: string }, before: string, after: string) {
  return `${before}<a href="${target.href}">${target.anchorText}</a>${after}`;
}

function buildAnswerSummary(topic: SeoTopicCandidate, primaryKeyword: string) {
  return `${topic.title.replace(/[？?]+$/, "")}，本质上说明整木门店和整木工厂都在重新理解线上获客：真正有价值的不是堆砌宣传，而是用 ${primaryKeyword} 把官网内容、案例整理、FAQ 沉淀和百度搜索入口做成可持续更新的内容资产。`;
}

function buildConceptSummary(topic: SeoTopicCandidate) {
  return `${topic.themeLabel}做内容升级时，重点不是多写，而是让整木门店、整木工厂、设计师和高端客户都能快速读懂核心判断。`;
}

function buildApplicableScenarios(topic: SeoTopicCandidate) {
  return `适合用于${topic.themeLabel}的官网内容更新、案例整理、百度搜索专题、小红书与抖音选题规划，以及面向设计师和高端客户的常见问题沉淀。`;
}

function buildKeyFacts(topic: SeoTopicCandidate, primaryKeyword: string) {
  return [
    `${primaryKeyword}最适合先用于案例整理、官网内容更新、FAQ 沉淀和短视频脚本初稿。`,
    `${topic.themeLabel}做内容时，必须把木门、护墙板、柜体、楼梯和背景墙这些真实场景写具体。`,
    `面向别墅大宅、高端客户和设计师的内容，判断句、步骤句和风险边界句比口号更重要。`,
    `只有站内链接、关键词链接和相关文章链接都指向真实页面，SEO 和 GEO 才会形成闭环。`,
  ];
}

function buildClaimCheckHints(topic: SeoTopicCandidate) {
  return [
    `${topic.themeLabel}是否写到了真实交付场景`,
    "是否明确写出适用场景与风险边界",
    "是否把 AI 只放在适合提效的位置，而不是代替报价和交付判断",
  ];
}

async function buildInternalLinks(topic: SeoTopicCandidate) {
  const staticLinks = buildSeoStaticInternalLinks(topic.contentLine);
  const publishedLinks = await resolvePublishedInternalLinks({
    contentLine: topic.contentLine,
    keyword: topic.keywordSeed,
    limit: 1,
  }).catch(() => [] as Array<{ title: string; href: string; anchorText: string }>);

  return unique([...staticLinks, ...publishedLinks].map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)).slice(0, 4);
}

function buildSectionParagraphs(topic: SeoTopicCandidate, primaryKeyword: string, variant: number, links: Awaited<ReturnType<typeof buildInternalLinks>>) {
  const [linkA, linkB, linkC, linkD] = links;
  const extraSentence =
    variant > 0
      ? "这一步做深以后，门店和工厂的内容会从“零散发一篇”变成“围绕同一主题反复沉淀”。"
      : "";

  return [
    {
      heading: "行业背景：整木门店为什么开始重新看待内容投入",
      blocks: [
        p(`过去很多整木门店更依赖熟人转介绍、线下活动和设计师关系，但现在高端客户在第一次咨询前，往往已经先通过百度搜索、小红书、抖音和官网内容完成了一轮自我判断。对整木门店来说，这套方法开始重要，不是因为潮流变了，而是客户获取信息的顺序变了。`),
        p(`定义：对整木门店来说，${primaryKeyword}不是让 AI 替代销售和设计，而是让案例整理、官网内容更新、FAQ 沉淀和短视频脚本初稿更快、更稳地生产出来，并最终服务于线上获客和转化。${extraSentence}`),
      ],
    },
    {
      heading: "判断：门店开始重视这套方法的底层原因",
      blocks: [
        p(`判断：真正让整木门店开始重视 ${primaryKeyword} 的原因，不是单篇文章好不好看，而是官网内容长期缺位、案例整理太慢、FAQ 没有沉淀，导致高端客户和设计师在线上看不到足够清晰的判断依据。`),
        p(`木门、护墙板、柜体、楼梯和背景墙这些内容，如果只停留在朋友圈零散展示，既不利于百度搜索收录，也不利于 AI 搜索在回答时直接引用。相反，只要把内容做成栏目、专题和案例页，整木门店和整木工厂就能持续积累可复用的官网内容资产。`),
      ],
    },
    {
      heading: "适用场景：哪些整木业务最适合先接入这套方法",
      blocks: [
        p(`适用场景：最适合先落地的，是别墅大宅、高端客户、设计师协同项目，以及需要反复解释工艺、材质和交付边界的门店场景。像原木定制、全屋定制、木门护墙板联动、柜体背景墙组合、楼梯和收口细节展示，都是更适合优先整理的内容主题。`),
        p(buildInternalLinkSentence(linkA, "如果团队还没有清晰的内容母体，建议先回到", "梳理栏目，再把高频问题拆成专题。")),
        p(buildInternalLinkSentence(linkB, "关键词和术语表达不统一时，可以同步整理", "，避免不同页面说法互相打架。")),
      ],
    },
    {
      heading: "风险边界：哪些事情不适合直接交给 AI",
      blocks: [
        p(`风险边界：对整木门店来说，AI 推广最适合先用于案例整理、官网内容更新、客户常见问题沉淀和短视频脚本初稿，不适合直接用于报价、工艺承诺和交付周期判断。`),
        p(`不适合场景还包括高端客户的一对一方案定稿、设计师协同中的细节承诺、复杂楼梯和背景墙节点判断，以及任何带有合同责任的交付表达。只要内容牵涉价格、工艺承诺和售后边界，就必须由门店、工厂和项目负责人人工复核。`),
      ],
    },
    {
      heading: "落地步骤：整木门店怎么把这套方法真正跑起来",
      blocks: [
        p(`步骤：第一步，先把木门、护墙板、柜体、楼梯、背景墙等案例素材按项目、空间、工艺和客户问题重新归档；第二步，为官网内容建立栏目结构；第三步，把案例整理、FAQ、小红书和抖音脚本初稿交给 AI 提效；第四步，用人工审核把关承诺、报价和交付边界；第五步，把通过审核的内容持续回流到官网和百度搜索入口。`),
        ol([
          "先确定 10 到 20 个最常被高端客户问到的问题，并整理真实案例截图、设计说明和交付节点。",
          buildInternalLinkSentence(linkC, "再围绕问题补齐", "，让预算、材质、工艺和交付解释形成长期可复用页面。"),
          buildInternalLinkSentence(linkD ?? linkA, "随后把栏目、术语和标准表达统一到", "，避免页面之间链接错位或锚文本空泛。"),
          "最后再把官网内容拆成适合小红书、抖音和设计师沟通的短内容版本，形成一套持续更新机制。",
        ]),
      ],
    },
  ];
}

function buildSummaryParagraph(topic: SeoTopicCandidate, primaryKeyword: string) {
  return `${topic.themeLabel}现在重视这套内容方法，并不是为了追热点，而是为了让官网内容、案例整理、FAQ 沉淀和搜索入口真正形成稳定的线上获客系统。只要把适用场景、风险边界、落地步骤和真实案例讲清楚，SEO 与 GEO 才会一起生效。`;
}

async function composeArticle(topic: SeoTopicCandidate, batchId: string, triggerSource: TriggerSource, variant: number) {
  const primaryKeyword = inferPrimaryKeyword(topic.title, topic.entityLabel);
  const internalLinks = await buildInternalLinks(topic);
  const summary = buildAnswerSummary(topic, primaryKeyword);
  const faqPairs = buildFaqPairs(topic);
  const sectionParagraphs = buildSectionParagraphs(topic, primaryKeyword, variant, internalLinks);
  const excerpt = [
    `${topic.themeLabel}开始重视 ${primaryKeyword}，不是为了追工具热度，而是因为线上获客越来越依赖官网内容、案例整理、FAQ 沉淀和百度搜索入口。`,
    `对整木门店、整木工厂、设计师和高端客户来说，能被 AI 搜索直接引用的定义句、判断句、步骤句和风险边界句，正在成为新的内容竞争力。`,
  ].join("");

  const faqHtml = faqPairs
    .map((item) => `${h3(item.q)}${p(item.a)}`)
    .join("");

  const content = normalizeRichTextField(
    [
      p(`定义：${summary}`),
      ...sectionParagraphs.flatMap((section) => [h2(section.heading), ...section.blocks]),
      h2("常见问题 FAQ"),
      faqHtml,
      h2("结尾总结"),
      p(buildSummaryParagraph(topic, primaryKeyword)),
    ].join(""),
  ) || "";

  const keywords = buildKeywords(topic);
  const slug = buildCompactSeoSlug(topic.title, primaryKeyword);
  const qualityReport = evaluateSeoArticleQuality({
    title: topic.title,
    excerpt,
    content,
    slug,
    keywords,
    faqPairs,
    primaryKeyword,
  });

  return {
    title: topic.title,
    excerpt,
    keywords,
    content,
    slug,
    internalLinks,
    status: "pending" as const,
    publishedAt: null,
    sourceType: "ai_generated" as const,
    source: SEO_AUTOGEN_SOURCE,
    generationBatchId: batchId,
    keywordSeed: topic.keywordSeed,
    keywordIntent: topic.keywordIntent,
    answerSummary: summary,
    conceptSummary: buildConceptSummary(topic),
    applicableScenarios: buildApplicableScenarios(topic),
    faqPairs,
    keyFacts: buildKeyFacts(topic, primaryKeyword),
    entityTerms: unique([topic.themeLabel, topic.entityLabel, primaryKeyword, "整木门店", "整木工厂", "官网内容", "案例整理"]),
    claimCheckHints: buildClaimCheckHints(topic),
    contentLine: topic.contentLine,
    section: topic.sectionLabel,
    category: topic.categoryLabel,
    subCategory: topic.subCategoryLabel,
    categoryHref: topic.categoryHref,
    subHref: topic.subHref,
    contentHash: buildSeoContentHash(topic.title, content),
    triggerSource,
    qualityReport,
  };
}

export async function buildArticle(topicInput: TopicLike, batchId: string, triggerSource: TriggerSource = "cron") {
  const topic = normalizeTopic(topicInput);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const article = await composeArticle(topic, batchId, triggerSource, attempt);
    const linkValidation = await validateInternalLinks({
      html: article.content,
      keywordCsv: article.keywords,
    });
    const qualityIssues = [
      ...article.qualityReport.issues,
      ...linkValidation.broken.map((item) => `broken_link:${item.href}`),
    ];

    if (qualityIssues.length === 0) {
      return article;
    }

    if (attempt === 1) {
      return {
        ...article,
        qualityReport: {
          ...article.qualityReport,
          pass: false,
          issues: qualityIssues,
        },
      };
    }
  }

  throw new Error("unreachable");
}

async function loadExistingArticles() {
  return prisma.article.findMany({
    where: {
      OR: [
        { categoryHref: { startsWith: "/news" } },
        { subHref: { startsWith: "/news" } },
        { categoryHref: { startsWith: "/brands/buying" } },
        { subHref: { startsWith: "/brands/buying" } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 1200,
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
    assertNoDirtyText(
      [
        { label: "标题", value: article.title },
        { label: "摘要", value: article.excerpt },
        { label: "答案摘要", value: article.answerSummary },
        { label: "正文", value: article.content },
      ],
      "SEO 自动生成草稿命中脏词拦截",
    );

    const preferredSlug = buildCompactSeoSlug(article.title, article.keywordSeed);
    const slug = await generateUniqueArticleSlug(preferredSlug);
    const created = await prisma.article.create({
      data: {
        title: article.title,
        slug,
        sourceType: article.sourceType,
        source: article.source,
        generationBatchId: article.generationBatchId,
        keywordSeed: article.keywordSeed,
        keywordIntent: article.keywordIntent,
        contentLine: article.contentLine,
        excerpt: article.excerpt,
        answerSummary: article.answerSummary,
        conceptSummary: article.conceptSummary,
        applicableScenarios: article.applicableScenarios,
        content: article.content,
        contentHash: article.contentHash,
        categoryHref: article.categoryHref,
        subHref: article.subHref,
        sectionLabel: article.section,
        categoryLabel: article.category,
        subCategoryLabel: article.subCategory,
        entityTerms: article.entityTerms.join("、"),
        claimCheckHints: article.claimCheckHints.join("\n"),
        faqPairsJson: JSON.stringify(article.faqPairs),
        keyFactsJson: JSON.stringify(article.keyFacts),
        faqJson: JSON.stringify(article.faqPairs),
        manualKeywords: article.keywords,
        status: "pending",
        publishedAt: null,
        reviewNote: `dual-line seo draft | batch=${article.generationBatchId} | trigger=${article.triggerSource} | quality=${article.qualityReport.pass ? "pass" : "fail"} | issues=${article.qualityReport.issues.join("|") || "none"} | line=${article.contentLine} | seed=${article.keywordSeed} | intent=${article.keywordIntent}`,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        categoryHref: true,
        subHref: true,
        contentLine: true,
      },
    });
    saved.push(created);
  }

  return saved;
}

export async function runDualLineSeoContentGenerator() {
  loadLocalEnvIfNeeded();

  const count = Math.max(1, Math.min(5, Number.parseInt(readArg("count") || String(DEFAULT_SEO_GENERATION_COUNT), 10) || DEFAULT_SEO_GENERATION_COUNT));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
  const approved = boolArg("approved", SEO_APPROVED_DEFAULT);
  const timezone = readArg("timezone") || "Asia/Shanghai";
  const explicitTitle = readArg("title").trim();
  const triggerSourceArg = readArg("trigger-source") || readArg("triggerSource");
  const triggerSource: TriggerSource =
    dryRun
      ? "dry_run"
      : triggerSourceArg === "manual" || triggerSourceArg === "cron"
        ? triggerSourceArg
        : "cron";

  if (approved) {
    throw new Error("Dual-line SEO generator does not support auto-approved publishing");
  }
  if (!dryRun && process.env.SEO_NEWS_AUTOGEN_ENABLED !== "true") {
    throw new Error("SEO dual-line generation is temporarily disabled");
  }

  const batchId = `dual-seo-${new Date().toISOString().slice(0, 10)}-${triggerSource}-${createHash("md5").update(String(Date.now())).digest("hex").slice(0, 6)}`;

  if (explicitTitle) {
    const article = await buildArticle(inferTopicFromTitle(explicitTitle), batchId, triggerSource);
    if (dryRun) {
      return {
        dryRun: true,
        approved,
        timezone,
        triggerSource,
        generationBatchId: batchId,
        stats: { rawCandidateCount: 1, filteredCandidateCount: 1, finalPickedCount: 1, filterReasonCounts: {} },
        items: [article],
      };
    }

    if (!article.qualityReport.pass) {
      throw new Error(`generated article failed quality gate: ${article.qualityReport.issues.join(",")}`);
    }

    const saved = await persistGeneratedArticles([article]);
    return {
      dryRun: false,
      approved,
      timezone,
      triggerSource,
      generationBatchId: batchId,
      stats: { rawCandidateCount: 1, filteredCandidateCount: 1, finalPickedCount: 1, filterReasonCounts: {} },
      savedCount: saved.length,
      items: saved,
    };
  }

  const [{ picked, candidates, stats }, existingArticles] = await Promise.all([pickSeoTopicsForGeneration(count), loadExistingArticles()]);
  const generated: GeneratedSeoArticle[] = [];
  const skipped: Array<{ title: string; reason: string }> = [];

  for (const topic of picked) {
    const article = await buildArticle(topic, batchId, triggerSource);
    const leadDupReason = findSeoLeadDuplicateReason(article.content, existingArticles, { similarityThreshold: 0.992 });
    if (leadDupReason) {
      skipped.push({ title: article.title, reason: leadDupReason });
      continue;
    }
    if (!article.qualityReport.pass) {
      skipped.push({ title: article.title, reason: article.qualityReport.issues.join(",") || "quality_gate_failed" });
      continue;
    }
    article.slug = await generateUniqueArticleSlug(buildCompactSeoSlug(article.title, article.keywordSeed));
    generated.push(article);
  }

  if (dryRun) {
    return {
      dryRun: true,
      approved,
      timezone,
      triggerSource,
      generationBatchId: batchId,
      stats,
      candidatePreview: candidates.slice(0, 12).map((item) => ({
        title: item.title,
        line: item.contentLine,
        section: item.sectionLabel,
        subCategory: item.subCategoryLabel,
        keywordSeed: item.keywordSeed,
        keywordIntent: item.keywordIntent,
        totalScore: item.totalScore,
      })),
      skipped,
      items: generated,
    };
  }

  const saved = await persistGeneratedArticles(generated);
  return {
    dryRun: false,
    approved,
    timezone,
    triggerSource,
    generationBatchId: batchId,
    stats,
    skipped,
    savedCount: saved.length,
    items: saved,
  };
}

async function main() {
  const result = await runDualLineSeoContentGenerator();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  void main()
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
