import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";
import { generateUniqueArticleSlug } from "../lib/slug";
import { assertNoDirtyText } from "../lib/article-input-guard";
import { buildSeoContentHash, findSeoLeadDuplicateReason } from "../lib/seo-dedup";
import { SEO_CORE_INTERNAL_LINKS } from "../lib/seo-keyword-seeds";
import { pickSeoTopicsForGeneration, type BodySkeleton, type SeoTopicCandidate, type SeoTopicSelectionStats } from "../lib/seo-topic-generator";
import {
  DEFAULT_NEWS_AFTERMARKET_CONFIG,
  NEWS_AFTERMARKET_SUBCATEGORY,
  getNewsAftermarketConfig,
  stringifyProductRecommendations,
} from "../lib/news-aftermarket";

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
  subHref: string;
  sourceType: "ai_generated";
  source: "auto_seo_generator";
  generationBatchId: string;
  keywordSeed: string;
  keywordIntent: string;
  contentHash: string;
  productRecommendations?: string | null;
  audience: "c_end" | "b_end";
  titleStyle: SeoTopicCandidate["titleStyle"];
  titleFrame: string;
  bodySkeleton: BodySkeleton;
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

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function loadLocalEnvIfNeeded() {
  const envFiles = [resolve(process.cwd(), ".env.production"), resolve(process.cwd(), ".env")];

  for (const filePath of envFiles) {
    let content = "";
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]?.trim()) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }

    break;
  }
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
      topic.title.includes("多少钱") || topic.title.includes("价格") ? "整木定制价格" : "",
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
    filtered.length >= 2 ? filtered : SEO_CORE_INTERNAL_LINKS.filter((item) => !topic.title.includes(item.title))
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

function buildConsumerLead(topic: SeoTopicCandidate) {
  switch (topic.titleStyle) {
    case "scene":
      return `${topic.keywordSeed}不是只看单价就能判断的问题。很多业主真正关心的是100㎡要花多少钱、10万够不够、哪些空间先做更稳，这些都要先拆成场景和预算边界。`;
    case "contrast":
      return `${topic.keywordSeed}看起来像在比价格，实际上比的是报价边界、材料结构和交付复杂度。只看单价很容易觉得“差不多”，真正拉开差距的往往是方案范围和落地难度。`;
    case "avoidance":
      return `${topic.keywordSeed}最怕的不是一开始贵一点，而是中途不断加项、返工和延期。先把最容易出问题的环节看清楚，反而更容易把预算和结果都控住。`;
    case "cognition":
      return `${topic.keywordSeed}之所以难判断，往往不是信息太少，而是判断顺序错了。先分清自己更看重统一效果、材料质感还是预算效率，再看报价和品牌，决策会清楚很多。`;
    default:
      return `${topic.keywordSeed}没有一个简单答案，因为价格、材料和交付能力都会一起影响结果。真正稳妥的做法，不是只问一句“多少钱”，而是把预算拆分、影响因素和决策标准一次看明白。`;
  }
}

function buildBusinessLead(topic: SeoTopicCandidate) {
  switch (topic.titleStyle) {
    case "contrast":
      return `${topic.keywordSeed}之所以总觉得没效果，很多时候不是因为没投流量，而是客户进站后没有看到真正能帮助决策的内容。搜索进来的客户，如果第一屏看不到报价逻辑、案例边界和交付能力，询盘质量就很难高。`;
    case "question":
      return `${topic.keywordSeed}不是简单地发几篇资讯就够了。真正能带来客户的内容，必须直接对应客户正在搜索的问题，让客户在咨询前就知道你解决什么、适合谁、报价逻辑是什么。`;
    default:
      return `${topic.keywordSeed}这类问题的核心，不在渠道多不多，而在内容有没有把客户的犹豫点讲明白。预算、案例、交付、工期和材料判断如果都模糊，门店和工厂就很容易把流量浪费在无效沟通上。`;
  }
}

function buildSkeletonSections(topic: SeoTopicCandidate) {
  const isBusiness = topic.audience === "b_end";

  if (isBusiness) {
    switch (topic.bodySkeleton) {
      case "pricing_compare":
        return [
          {
            heading: "为什么客户会觉得报价差异大",
            body: "对工厂或门店来说，客户最容易流失的阶段不是留资前，而是看完内容后仍然弄不懂价格差异。没有把板材、工艺、五金、安装和交付边界讲清楚，客户只会把所有报价都看成“差不多”，最后转去比更低的价格。",
          },
          {
            heading: "哪些内容最能缩短比价周期",
            body: "最有效的内容不是泛泛宣传，而是把报价单怎么看、案例适合谁、工期如何安排、不同方案差在哪几篇讲透。客户一旦能在网站上看懂这些内容，询盘质量和到店后的沟通效率都会明显提升。",
          },
          {
            heading: "低价为什么反而容易拖慢成交",
            body: "如果内容只强调低价，很容易吸引大量不匹配的客户。真正高质量的询盘，往往来自那些看完报价逻辑、交付流程和案例边界之后，已经知道自己要问什么的人。",
          },
          {
            heading: "更稳的内容布局怎么做",
            body: "先布局预算、报价、案例和交付能力，再补品牌介绍和活动资讯。这样搜索客户在进入网站后能顺着自己的决策路径往下看，成交动作就不会只靠销售临场发挥。",
          },
        ];
      case "scenario_solution":
        return [
          {
            heading: "先把客户的场景说具体",
            body: "门店和工厂常见的问题，是内容说了很多“实力”，却没有讲客户所在的真实场景。比如100㎡改善型住宅、别墅项目、小户型预算有限，这些场景一旦说具体，客户就会更容易判断自己是否适合。",
          },
          {
            heading: "方案和预算要一起落地",
            body: "客户看内容时最需要的，不是抽象优势，而是不同预算能做什么、哪些空间必须先做、哪些部分可以后置。场景化内容一旦建立，询盘自然会更接近真实需求。",
          },
          {
            heading: "哪些地方最适合做取舍",
            body: "真正能帮助成交的内容，要把预算优先级、材料档次和交付节奏讲明白。这样客户到店前就已经形成预期，现场沟通会更容易进入方案确认，而不是从头解释一遍。",
          },
          {
            heading: "为什么这种内容更容易留资",
            body: "因为客户看到的是自己的问题被回答，而不是企业单方面输出。场景越清晰，客户越容易代入，也越愿意继续留下联系方式或预约到店。",
          },
        ];
      case "industry_cognition":
        return [
          {
            heading: "先澄清一个常见误区",
            body: "很多团队以为“多发内容”就等于“有获客”。但对整木行业来说，真正决定效果的，是内容有没有对应客户搜索意图，而不是文章数量本身。",
          },
          {
            heading: "为什么行业里没有统一答案",
            body: "整木客户的决策路径天然更长，既要比预算，也要看材料、案例和交付能力。没有哪一篇内容能解决全部问题，所以内容结构必须顺着客户的判断顺序来搭建。",
          },
          {
            heading: "真正影响结果的因素是什么",
            body: "是否讲清预算边界、案例适配、交付流程和材料差异，往往比投放渠道本身更影响询盘质量。客户越早在内容里看懂这些信息，后续的成交效率越高。",
          },
          {
            heading: "给工厂或门店的判断建议",
            body: "优先补齐那些客户正在搜、却还没人讲清的高意向问题。与其追求内容数量，不如先把少数真正能促进询盘和成交的页面做深做透。",
          },
        ];
      default:
        return [
          {
            heading: "先明确客户的问题到底卡在哪",
            body: "高意向客户通常不会只问一句“多少钱”，而是会同时关心预算、案例、材料和交付。内容如果只能回答一小部分，询盘自然很难留下来。",
          },
          {
            heading: "设计与交付能力要一起展示",
            body: "客户并不只在意效果图，还会判断你有没有能力把方案真正落地。所以案例不能只放结果图，还要补充户型、预算和施工交付信息。",
          },
          {
            heading: "报价内容必须能对上客户预期",
            body: "如果网站上的报价内容太模糊，客户进站后还是不知道大概要花多少钱、差异在哪里，就很容易继续流失到别家。报价逻辑讲得越清楚，成交过程越省力。",
          },
          {
            heading: "最后如何把内容接到成交动作",
            body: "每篇内容都要让客户知道下一步该做什么，比如看案例、预约沟通或提交需求。只有把内容和动作串起来，才会变成真正的成交工具。",
          },
        ];
    }
  }

  switch (topic.bodySkeleton) {
    case "budget_breakdown":
      return [
        {
          heading: "用户最常见的预算误区",
          body: "很多人一上来只问整木定制多少钱一平，但忽略了空间范围、造型复杂度和安装条件。结果看似单价合理，后面却不断因为加项和变更超出预算。",
        },
        {
          heading: "预算通常由哪些部分构成",
          body: "整木定制预算通常要拆成柜体、木门、墙板、顶面造型、五金、油漆工艺和安装运输几部分。面积一样、覆盖范围不同，最后总价就会差很多。",
        },
        {
          heading: "哪些环节最容易超支",
          body: "最常见的超支点，不是主材本身，而是中途加做护墙板、复杂收口、升级五金、现场返工和补充安装。前期如果不把清单边界说清楚，后面很难控住总价。",
        },
        {
          heading: "怎么把预算控制得更稳",
          body: "更稳的做法是先定总预算，再区分必做空间和可后置空间，最后再考虑材料升级。这样看到报价时，你就能更快判断哪些钱该花、哪些加项可以先放一放。",
        },
      ];
    case "pricing_compare":
      return [
        {
          heading: "为什么整木价格差异会很大",
          body: "整木报价看起来都叫整木定制，但背后包含的范围可能完全不同。有的只算柜体，有的把木门、墙板、顶面造型和安装都算进去，单看总价很容易误判。",
        },
        {
          heading: "板材、工艺、五金和安装差在哪",
          body: "真正拉开价格差距的，往往是板材结构、饰面工艺、五金等级、现场安装复杂度和交付难度。尤其是复杂收口和异形空间，往往比单纯的材料升级更影响总价。",
        },
        {
          heading: "报价单到底该怎么看",
          body: "先看有没有把空间范围写清，再看材料等级、五金配置、工艺做法和安装是否包含。谁把清单边界写得更完整，谁的报价就更有参考价值。",
        },
        {
          heading: "如何避免只看低价",
          body: "低价方案最容易把关键部分拆开另算，或者把后期最容易加项的工序留到现场再补。与其比谁便宜，不如先确认谁把范围和交付讲得更清楚。",
        },
      ];
    case "scenario_solution":
      return [
        {
          heading: "先看自己属于什么场景",
          body: "整木定制的预算和方案，跟户型、面积和使用周期关系很大。100㎡改善型住宅、别墅项目、小户型刚需，这些场景的优先级本来就不一样，不能直接套同一套价格逻辑。",
        },
        {
          heading: "预算或方案该怎么分配",
          body: "更稳妥的分配顺序通常是先做客厅、主卧和必须落地的收纳空间，再决定木门、墙板和造型部分的投入比例。这样既能保证整体效果，也不容易一开始就把预算压满。",
        },
        {
          heading: "哪些地方可以做取舍",
          body: "如果预算有限，优先保留基础柜体、关键门墙界面和高频使用空间，把复杂造型、低频空间和高成本升级项后置，通常更容易兼顾效果和成本。",
        },
        {
          heading: "怎样更稳地落地",
          body: "先把空间优先级、预算边界和材料等级三件事定下来，再让门店或工厂出方案。这样报价和方案更容易对齐，后续施工和交付也会更顺。",
        },
      ];
    case "industry_cognition":
      return [
        {
          heading: "先澄清一个认知误区",
          body: "很多人以为整木定制应该像成品家具一样有统一价格，其实行业里很难有标准答案。整木更像是方案组合，范围和做法稍微一变，价格就会跟着变。",
        },
        {
          heading: "为什么行业里没有统一标准答案",
          body: "不同门店和工厂的报价方式、材料结构、五金标准和安装边界都不一样。只看一个数字，往往只能看到结果，看不到背后的成本逻辑。",
        },
        {
          heading: "真正影响选择的因素是什么",
          body: "预算边界、材料取舍、交付能力和后期维护成本，通常比“品牌名气大不大”更直接影响实际体验。先看这些因素，判断会更准确。",
        },
        {
          heading: "给用户的判断建议",
          body: "不要急着先比最低价，而是先弄清楚自己最看重的是什么：统一效果、材料稳定性，还是预算效率。顺序一旦理顺，很多问题自然会有答案。",
        },
      ];
    default:
      return [
        {
          heading: "先明确需求到底是什么",
          body: "做整木定制前，先想清楚自己要解决的是统一风格、提高收纳、改善材料质感，还是控制预算效率。需求越清楚，后面的报价和方案越容易判断。",
        },
        {
          heading: "看设计能力也要看交付能力",
          body: "效果图做得好不代表现场就一定能落地。真正值得比较的，是设计是否和施工、安装、收口这些细节配得上。",
        },
        {
          heading: "报价是否真的和需求匹配",
          body: "有些报价看起来很便宜，但并没有把关键空间、五金配置或安装环节包含进去。判断时要看方案是不是和你的需求对得上，而不是只看总价。",
        },
        {
          heading: "最后怎么做决定更稳",
          body: "把预算、方案边界和材料等级三件事一起核对，再去比较品牌或门店。这样做虽然慢一点，但能明显减少后面返工和加项的风险。",
        },
      ];
  }
}

function buildConsumerBody(topic: SeoTopicCandidate, links: ReturnType<typeof buildInternalLinks>) {
  const sections = buildSkeletonSections(topic);
  return [
    paragraph(buildConsumerLead(topic)),
    ...sections.flatMap((section) => [heading(section.heading), paragraph(section.body)]),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[0].prompt,
      links[0]?.href ?? "/news/zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
      links[0]?.title ?? SEO_CORE_INTERNAL_LINKS[0].title,
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[1].prompt,
      links[1]?.href ?? "/news/zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
      links[1]?.title ?? SEO_CORE_INTERNAL_LINKS[1].title,
    ),
    heading("总结"),
    paragraph("整木定制不是不能问价格，而是不能只问价格。把预算拆分、影响因素和决策顺序理清以后，再去比材料、门店和品牌，通常更容易避开低价陷阱和后期加项。"),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[2].prompt,
      links[2]?.href ?? "/news/zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
      links[2]?.title ?? SEO_CORE_INTERNAL_LINKS[2].title,
    ),
  ].join("");
}

function buildBusinessBody(topic: SeoTopicCandidate, links: ReturnType<typeof buildInternalLinks>) {
  const sections = buildSkeletonSections(topic);
  return [
    paragraph(buildBusinessLead(topic)),
    ...sections.flatMap((section) => [heading(section.heading), paragraph(section.body)]),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[0].prompt,
      links[0]?.href ?? "/news/zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
      links[0]?.title ?? SEO_CORE_INTERNAL_LINKS[0].title,
    ),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[1].prompt,
      links[1]?.href ?? "/news/zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
      links[1]?.title ?? SEO_CORE_INTERNAL_LINKS[1].title,
    ),
    heading("总结"),
    paragraph("工厂和门店真正需要的，不是更多泛流量，而是更明确的高意向问题内容。谁能在客户搜索阶段把预算、案例、交付和报价讲清楚，谁就更容易拿到高质量询盘和更顺的成交节奏。"),
    linkSentence(
      SEO_CORE_INTERNAL_LINKS[2].prompt,
      links[2]?.href ?? "/news/zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
      links[2]?.title ?? SEO_CORE_INTERNAL_LINKS[2].title,
    ),
  ].join("");
}

function buildExcerpt(topic: SeoTopicCandidate) {
  if (topic.audience === "b_end") {
    if (topic.titleStyle === "contrast") {
      return `${topic.keywordSeed}为什么总没效果，很多时候问题不在流量，而在网站内容没有回应客户最关心的预算、案例和交付问题。本文重点拆解哪些内容最容易带来有效询盘和真实成交。`;
    }
    return `${topic.keywordSeed}不能只靠发资讯或投广告，关键是让客户在浏览内容时就看懂报价逻辑、案例边界和下一步动作。本文重点讲清工厂或门店该先布局哪些高意向内容。`;
  }

  if (topic.titleStyle === "scene") {
    return `${topic.keywordSeed}不是只看单价就够，很多业主真正关心的是100平要花多少钱、10万够不够、哪些空间最容易超预算。本文把预算拆分、价格差异和决策顺序一次讲清。`;
  }
  if (topic.titleStyle === "contrast") {
    return `${topic.keywordSeed}看起来像在比价格，实际比的是报价边界、材料结构和交付复杂度。本文重点拆解整木定制为什么会有明显价差，以及判断贵在哪的几个关键点。`;
  }
  if (topic.titleStyle === "avoidance") {
    return `${topic.keywordSeed}最怕的不是一开始贵一点，而是中途加项、返工和延期。本文重点讲清哪些地方最容易踩坑、最容易超预算，以及下决定前要先问清哪些问题。`;
  }
  return `${topic.keywordSeed}没有统一答案，真正影响判断的通常是预算边界、材料选择和交付能力。本文会从预算拆分、价格影响因素和决策建议三个方面，帮你把问题看清。`;
}

function getAftermarketSeason(date: Date) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

function buildAftermarketTitle(date: Date) {
  const season = getAftermarketSeason(date);
  const frames = [
    `${season}木制品清洁养护怎么做更稳妥？高端木作日常保养与进口护理产品推荐`,
    `木门木饰面怎么清洁保养？${season}整木后市场护理建议与进口产品推荐`,
    `高端木作日常护理指南：木饰面、柜体、护墙板清洁养护与进口产品怎么选`,
    `整木后市场观察：进口木作护理产品如何用于木门、柜体与护墙板日常养护`,
  ];
  return frames[date.getDate() % frames.length] ?? frames[0];
}

function buildAftermarketExcerpt(title: string) {
  return `${title}。文章围绕木门、木饰面、柜体、护墙板与木家具等场景，梳理清洁误区、日常养护建议，以及适合高端木作护理的进口产品选择思路。`;
}

function buildAftermarketContent(date: Date) {
  const season = getAftermarketSeason(date);
  return normalizeRichTextField(
    [
      paragraph("木作空间越高端，后期清洁和养护越不能用“通用清洁剂”一把抓。尤其是木门、木饰面、柜体、护墙板和木家具这类长期可见面，一旦清洁方式不当，容易出现漆面发乌、表层失光、木皮边缘受潮或污渍反复附着的问题。"),
      heading("为什么整木项目更需要重视后市场护理"),
      paragraph("很多用户在前期更关注设计、材质和安装，却容易忽略交付后的长期维护。实际上，整木项目是否能持续保持质感，很大程度取决于日常护理是否专业。对高端木作来说，护理产品需要兼顾温和清洁、表面保护和长期稳定性，不能只追求“去污快”。"),
      heading(`${season}木制品清洁养护常见误区`),
      paragraph("常见误区包括使用强碱性或高酒精清洁剂、湿布长时间覆盖木饰面、把地板护理油直接用于柜体和木门表面，以及在没有明确适配说明的情况下频繁混用不同产品。对于开放漆、木皮饰面和高定柜体，这些做法都可能放大后期维护风险。"),
      heading("更适合高端木作的护理思路"),
      paragraph("更稳妥的做法，是根据木作表面状态区分“日常除尘”“局部清洁”“定期养护”三种动作。日常阶段以低残留、温和型清洁为主；出现指印、水痕或轻度污渍时，再使用适合木作表面的专项护理产品；到换季阶段，再补充更有针对性的养护步骤，帮助木作表面维持稳定光泽和触感。"),
      heading("为什么进口护理产品更适合做后市场推荐"),
      paragraph("对于整木售后与高端私宅维护来说，国外原装进口、且有库存的木制品清洁养护产品更容易形成稳定交付。一方面，成熟品牌通常会把不同材质、不同漆面、不同使用场景区分得更清楚；另一方面，现货库存能减少推荐后无法及时到货的转化损耗，也更适合用于售后服务配套。"),
      heading("哪些场景更适合文章带商品转化"),
      paragraph("当用户正在搜索“木门怎么清洁”“木饰面怎么保养”“护墙板有手印怎么处理”“高端木作用什么护理产品”这类问题时，内容里自然带出适配产品，转化路径会更顺。比起直接堆砌广告，先把问题讲透，再给出适合的护理产品建议，更符合整木后市场内容的专业感。"),
      heading("选购和使用时要重点确认什么"),
      paragraph("建议优先确认产品是否适合木门、木饰面、柜体、护墙板或木家具等具体场景，是否明确标注适用表面，是否属于进口原装渠道，以及当前是否有库存。对推广内容来说，也应避免虚构功效和夸大效果，把“适用场景、使用频率、现货情况、服务配套”写清楚，才更有利于 SEO 和真实转化。"),
      heading("结语"),
      paragraph("整木后市场不是简单的售后补充，而是高端木作长期价值的一部分。围绕木作清洁、养护和保养建立持续内容，再结合进口护理产品与现货商品链接，才能把“资讯阅读”真正延伸成“护理方案了解”和“商品转化”两条链路。"),
    ].join(""),
  ) ?? "";
}

function buildAftermarketArticle(
  batchId: string,
  productRecommendations: string | null,
  seoKeywordTemplate: string[],
): GeneratedSeoArticle {
  const now = new Date();
  const title = buildAftermarketTitle(now);
  const content = buildAftermarketContent(now);
  return {
    title,
    excerpt: buildAftermarketExcerpt(title),
    keywords: seoKeywordTemplate.slice(0, 5).join(","),
    content,
    slug: "",
    internalLinks: [],
    status: "pending",
    publishedAt: null,
    categoryHref: "/news",
    subHref: NEWS_AFTERMARKET_SUBCATEGORY.href,
    sourceType: "ai_generated",
    source: "auto_seo_generator",
    generationBatchId: batchId,
    keywordSeed: "木制品清洁养护",
    keywordIntent: "aftermarket_conversion",
    contentHash: buildSeoContentHash(title, content),
    productRecommendations,
    audience: "c_end",
    titleStyle: "scene",
    titleFrame: "aftermarket_care",
    bodySkeleton: "scenario_solution",
  };
}

export function buildArticle(topic: SeoTopicCandidate, batchId: string): GeneratedSeoArticle {
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
    titleStyle: topic.titleStyle,
    titleFrame: topic.titleFrame,
    bodySkeleton: topic.bodySkeleton,
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
    assertNoDirtyText(
      [
        { label: "标题", value: article.title },
        { label: "摘要", value: article.excerpt },
        { label: "正文", value: article.content },
        { label: "关键词", value: article.keywords },
        {
          label: "审核备注",
          value: `SEO自动生成草稿；批次 ${article.generationBatchId}；种子词 ${article.keywordSeed}；意图 ${article.keywordIntent}`,
        },
      ],
      "SEO 新闻生成已拦截",
    );
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
        productRecommendations: article.productRecommendations ?? null,
        status: "pending",
        publishedAt: null,
        manualKeywords: article.keywords,
        reviewNote: `SEO自动生成草稿；批次 ${article.generationBatchId}；种子词 ${article.keywordSeed}；意图 ${article.keywordIntent}；titleStyle=${article.titleStyle}；titleFrame=${article.titleFrame}；bodySkeleton=${article.bodySkeleton}`,
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

    saved.push({
      ...record,
      excerpt: article.excerpt,
      keywords: article.keywords,
      audience: article.audience,
      titleStyle: article.titleStyle,
      titleFrame: article.titleFrame,
      bodySkeleton: article.bodySkeleton,
    });
  }

  return saved;
}

async function main() {
  loadLocalEnvIfNeeded();
  const count = Math.max(1, Math.min(5, Number.parseInt(readArg("count") || "3", 10) || 3));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
  if (!dryRun && process.env.SEO_NEWS_AUTOGEN_ENABLED !== "true") {
    throw new Error("SEO news generation is temporarily disabled");
  }
  const config = await getNewsAftermarketConfig().catch(() => DEFAULT_NEWS_AFTERMARKET_CONFIG);
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
      if (generated.length > 0 && generated[generated.length - 1]?.bodySkeleton === topic.bodySkeleton) {
        continue;
      }

      const article = buildArticle(topic, batchId);
      article.slug = await generateUniqueArticleSlug(article.title);
      generated.push(article);
    }
  }

  const aftermarketProductRecommendations = stringifyProductRecommendations(config.defaultProductPool);
  const aftermarketArticle = buildAftermarketArticle(
    batchId,
    aftermarketProductRecommendations,
    config.seoKeywordTemplate,
  );
  aftermarketArticle.slug = await generateUniqueArticleSlug(aftermarketArticle.title);
  generated.push(aftermarketArticle);

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
          historyWindowDays: stats.historyWindowDays,
          stats: runStats,
          generatedCount: generated.length,
          candidates: candidates.slice(0, 10).map((item) => ({
            title: item.title,
            keywordSeed: item.keywordSeed,
            keywordIntent: item.keywordIntent,
            titleStyle: item.titleStyle,
            titleFrame: item.titleFrame,
            bodySkeleton: item.bodySkeleton,
            score: item.score,
          })),
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
            titleStyle: item.titleStyle,
            titleFrame: item.titleFrame,
            bodySkeleton: item.bodySkeleton,
            productRecommendations: item.productRecommendations,
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
        historyWindowDays: stats.historyWindowDays,
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
