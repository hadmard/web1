import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { normalizeRichTextField } from "../lib/brand-content";
import { assertNoDirtyText } from "../lib/article-input-guard";
import { buildSeoContentHash, findSeoLeadDuplicateReason } from "../lib/seo-dedup";
import {
  DEFAULT_SEO_GENERATION_COUNT,
  SEO_APPROVED_DEFAULT,
  SEO_AUTOGEN_SOURCE,
  SEO_CORE_INTERNAL_LINKS,
  type SeoContentLine,
} from "../lib/seo-keyword-seeds";
import { pickSeoTopicsForGeneration, type SeoTopicCandidate } from "../lib/seo-topic-generator";
import { generateUniqueArticleSlug } from "../lib/slug";

type GeneratedFaqPair = { q: string; a: string };

type GeneratedSeoArticle = {
  title: string;
  excerpt: string;
  keywords: string;
  content: string;
  slug: string;
  internalLinks: Array<{ title: string; href: string; prompt: string }>;
  status: "pending";
  publishedAt: null;
  sourceType: "ai_generated";
  source: typeof SEO_AUTOGEN_SOURCE;
  generationBatchId: string;
  keywordSeed: string;
  keywordIntent: string;
  answerSummary: string;
  faqPairs: GeneratedFaqPair[];
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

function sentence(text: string) {
  return `<p>${text}</p>`;
}

function heading(text: string) {
  return `<h2>${text}</h2>`;
}

function isAiTopic(topic: SeoTopicCandidate) {
  return /AI/.test(topic.title) || /AI/.test(topic.keywordSeed) || /AI/.test(topic.keywordIntent);
}

function isBuyingMaterialTopic(topic: SeoTopicCandidate) {
  return /板材|木皮|五金|工艺|收口|环保/.test(`${topic.title}${topic.keywordSeed}`);
}

function isBuyingDeliveryTopic(topic: SeoTopicCandidate) {
  return /工期|安装|验收|合同|交付/.test(`${topic.title}${topic.keywordSeed}`);
}

function buildKeywords(topic: SeoTopicCandidate) {
  const base = [topic.keywordSeed, topic.themeLabel, topic.entityLabel];
  if (topic.contentLine === "buying") base.push("整木选购");
  if (topic.contentLine === "trend") base.push("行业趋势");
  if (topic.contentLine === "tech") base.push("技术发展");
  if (isAiTopic(topic)) base.push("AI推广");
  return Array.from(new Set(base)).slice(0, 5).join(",");
}

function buildAnswerSummary(topic: SeoTopicCandidate) {
  if (topic.contentLine === "buying") {
    if (isBuyingMaterialTopic(topic)) {
      return `${topic.title.replace(/？.*/, "")}没有固定标准，关键要把空间使用、预算边界、板材稳定性和后期维护放在一起判断。真正影响体验的，往往不是单个材料名词，而是柜体结构、木皮处理、五金寿命和收口细节能不能配合到位。`;
    }
    if (isBuyingDeliveryTopic(topic)) {
      return `${topic.title.replace(/？.*/, "")}最核心的不是流程名词，而是交付边界有没有提前写清。工期节点、安装费用、增项规则、验收标准和售后范围越明确，越能减少后期拖延、返工和扯皮。`;
    }
    return `${topic.title.replace(/？.*/, "")}没有统一答案，关键要看预算边界、材料工艺、门店或工厂交付能力是否匹配。先把价格构成、增项风险和验收标准看清，比只盯单价更容易做出稳妥判断。`;
  }

  if (topic.contentLine === "trend") {
    if (isAiTopic(topic)) {
      return `${topic.title.replace(/？.*/, "")}，本质上反映的是整木行业推广方式正在从零散展示转向结构化内容。AI 更适合提速官网内容、案例整理和常见问题生产，但客户沟通、方案判断和交付承诺仍然不能只靠 AI。`;
    }
    return `${topic.title.replace(/？.*/, "")}，背后反映的是整木行业获客和决策方式正在变化。客户越来越会先在线上判断案例、官网内容、报价逻辑和交付表达，谁能先把这些内容讲清楚，谁就更容易获得高质量咨询。`;
  }

  if (isAiTopic(topic)) {
    return `${topic.title.replace(/，.*/, "")}，关键不是多用几个 AI 工具，而是先把官网、案例页、产品页和问答内容的资料结构整理清楚。AI 适合提速初稿、整理素材和标准化表达，但最终判断、承诺和案例真实性仍要由门店或工厂把关。`;
  }

  return `${topic.title.replace(/，.*/, "")}，重点不是多发几篇文章，而是把官网、案例页、产品页和交付表达按客户决策顺序组织起来。页面越能直接回答客户问题，也越容易被搜索和 AI 联网结果理解。`;
}

function buildExcerpt(topic: SeoTopicCandidate, answerSummary: string) {
  const extra =
    topic.contentLine === "buying"
      ? "正文会继续拆开预算、材料、工艺、合同和验收这些真正影响决策的环节。"
      : topic.contentLine === "trend"
        ? isAiTopic(topic)
          ? "正文会重点说明 AI 在整木工厂和整木门店推广中的适用场景、边界和落地顺序。"
          : "正文会重点说明客户决策方式、搜索入口和内容展示为什么正在影响门店与工厂获客。"
        : isAiTopic(topic)
          ? "正文会给出官网内容、案例页、产品页和客户问答的 AI 使用动作，并说明哪些环节不能完全交给 AI。"
          : "正文会重点给出官网结构、案例页、产品页与内容布局的实操建议。";
  return `${answerSummary}${extra}`.slice(0, 158);
}

function buildFaqPairs(topic: SeoTopicCandidate): GeneratedFaqPair[] {
  if (isAiTopic(topic)) {
    return [
      { q: "整木工厂和门店哪些环节适合先用 AI？", a: "优先用在案例整理、官网内容初稿、客户常见问题和短视频脚本提纲。" },
      { q: "哪些环节不能完全交给 AI？", a: "报价承诺、工艺判断、交付边界、真实案例核验和客户一对一决策建议不能完全交给 AI。" },
      { q: "AI 内容最容易踩什么坑？", a: "最大的问题是资料不真实、表达太空泛、页面结构混乱，以及把行业术语直接丢给客户。" },
      { q: "AI 能不能直接解决询盘少的问题？", a: "不能直接解决，AI 只能提高内容整理和表达效率，前提仍是资料完整、页面结构合理、场景写得清楚。" },
    ];
  }

  if (topic.contentLine === "buying") {
    return [
      { q: "整木定制最容易超预算的地方是什么？", a: "常见在收口、五金升级、造型加项和现场返工。" },
      { q: "选门店和选工厂，先看什么？", a: "先看真实案例、交付边界和售后能力，再看单价。" },
      { q: "验收时最值得盯哪几项？", a: "重点看拼缝、封边、五金安装、收口细节和现场保护。" },
    ];
  }

  if (topic.contentLine === "trend") {
    return [
      { q: "为什么有流量却没有咨询？", a: "通常不是没曝光，而是页面没有回答客户最关心的问题。" },
      { q: "为什么客户报价后不回复？", a: "很多时候是报价逻辑、案例适配和交付能力表达不清。" },
      { q: "门店和工厂为什么都要补官网内容？", a: "因为客户越来越在联系前先做线上判断。" },
    ];
  }

  return [
    { q: "官网内容先补哪类页面？", a: "优先补案例页、产品页、报价解释页和交付流程页。" },
    { q: "案例页为什么不能只放图片？", a: "客户还需要看户型、预算、材料、工艺和交付信息。" },
    { q: "产品页怎么写更容易被搜索理解？", a: "标题、首段和小节首句都要直接说清问题和结论。" },
  ];
}

function buildKeyFacts(topic: SeoTopicCandidate) {
  if (isAiTopic(topic)) {
    return [
      "AI 更适合提速内容整理、初稿生成、案例结构化和问答归类，不适合独立替代专业判断。",
      "整木工厂和整木门店要先整理真实案例、产品资料和工艺信息，再谈 AI 提效。",
      "官网内容、案例页、产品页和客户问答页，是 AI 最容易先产生价值的几个场景。",
      "客户承诺、报价边界、交付节点和最终审核，仍然需要人工把关。",
    ];
  }

  if (topic.contentLine === "buying") {
    return [
      "整木选购不能只看单价，预算边界和增项规则更关键。",
      "板材、木皮、五金、收口和安装都会拉开实际报价差距。",
      "工厂和门店是否有真实案例、交付流程和售后边界，决定后期风险高低。",
      "合同、工期和验收标准写得越清楚，越能减少返工和扯皮。",
    ];
  }

  if (topic.contentLine === "trend") {
    return [
      "整木客户越来越会在咨询前先看案例、预算解释和交付表达。",
      "只靠关系型获客或朋友圈展示，越来越难覆盖高意向搜索流量。",
      "官网内容结构越清晰，门店和工厂越容易获得更高质量的咨询。",
      "流量问题很多时候只是表象，核心还是内容能不能支撑判断。",
    ];
  }

  return [
    "技术发展类内容重点不在概念，而在模块、页面和表达顺序。",
    "官网、案例页、产品页和报价页需要按客户决策路径衔接。",
    "内容越标准化，越容易减少反复沟通，也越利于搜索理解。",
    "工艺、板材和交付流程必须写成客户能看懂的话。",
  ];
}

function buildClaimCheckHints(topic: SeoTopicCandidate) {
  if (isAiTopic(topic)) {
    return ["AI 场景建议是否贴合整木门店或工厂真实流程", "是否明确写出 AI 不能替代的环节", "案例、官网、问答等动作是否具备可执行性"];
  }
  if (topic.contentLine === "buying") {
    return ["报价口径是否一致", "合同条款是否覆盖增项与售后", "工期与安装节点是否可落地"];
  }
  if (topic.contentLine === "trend") {
    return ["行业变化表述是否过度绝对", "获客趋势判断是否有站内场景支撑", "门店或工厂痛点是否与标题一致"];
  }
  return ["模块建议是否与现有栏目结构一致", "方法步骤是否能直接执行", "页面表达是否适合搜索抽取"];
}

function buildBuyingSections(topic: SeoTopicCandidate) {
  if (isBuyingMaterialTopic(topic)) {
    return [
      {
        title: "先看使用场景，再看材料名词",
        body: "整木定制、高定木作、定制家具在选板材、木皮、五金和收口时，不能只比某个名词听起来高级。真正要看的是空间湿度、使用频率、柜体结构、门板稳定性以及后期维护能不能承受。",
      },
      {
        title: "板材稳定性和工艺细节要一起判断",
        body: "实木、多层板、木皮、烤漆工艺各有适用场景，关键不是单点好坏，而是整套搭配是否稳定。柜体结构、封边、拼缝、木皮转角、五金寿命和收口完整度，才是后期耐用度的核心。",
      },
      {
        title: "展厅看样和交付落地往往不是一回事",
        body: "很多业主在门店只看效果板和样柜，但真正交付时会遇到木门、护墙板、柜体、五金、安装和现场收口的联动问题。选门店或工厂时，最好直接要求看真实案例、工艺细节图和安装验收照片。",
      },
      {
        title: "最后要把验收口径提前问清",
        body: "材料选得再贵，如果验收标准模糊，后面仍然容易扯皮。拼缝容差、木皮顺纹、五金品牌、收口处理、安装保护和售后责任，最好在报价和合同阶段就先说清楚。",
      },
    ];
  }

  if (isBuyingDeliveryTopic(topic)) {
    return [
      {
        title: "先把交付链路拆开，工期才有参考价值",
        body: "整木定制的工期不只是生产时间，还包括量尺、设计、确认、拆单、生产、运输、安装和现场修补。只问一句多久能装完，往往得不到真正能落地的答案。",
      },
      {
        title: "容易延期的往往不是工厂，而是边界没说清",
        body: "现场条件不具备、尺寸反复改动、增项没确认、安装费用口径模糊，都会让交付一拖再拖。真正要盯的是节点责任，而不是销售口头承诺的总天数。",
      },
      {
        title: "合同要把安装、增项和售后一起写进去",
        body: "报价单和合同如果各写各的，后面最容易出问题。安装是否外包、增项怎么计价、验收谁到场、售后多久响应，这些都要落实到文字里。",
      },
      {
        title: "验收要看细节，不要只看表面效果",
        body: "木门下垂、柜体封边、护墙板收口、五金安装、现场保护和卫生清理，都是验收时最容易被忽略的点。谁把验收标准写得细，谁的交付风险通常更低。",
      },
    ];
  }

  return [
    {
      title: "先看钱花在哪，而不是先盯单价",
      body: "整木定制、高定木作、定制家具这些项目，看似都在比报价，实际更该先拆预算。柜体、木门、护墙板、木皮、五金、收口、安装和交付，任何一项边界不清，后面都容易出现超预算。",
    },
    {
      title: "材料和工艺要和空间需求一起判断",
      body: "实木、多层板、木皮、油漆工艺并没有绝对谁更高级，关键是预算、空间湿度、使用频率和后期维护。真正要判断的，是板材稳定性、五金寿命、拼缝和收口能不能支撑日常使用。",
    },
    {
      title: "选门店或工厂，先看交付表达是否完整",
      body: "靠谱与否不能只看展厅和销售话术，更要看真实案例、交付流程、安装团队和售后边界。尤其是报价单、工期节点和验收标准有没有讲清楚，往往决定后面省不省心。",
    },
    {
      title: "合同、验收和工期才是避坑的最后一道线",
      body: "合同里要把增项规则、安装费用、售后范围、材质口径和延期责任写清。验收时要看木门、柜体、五金、收口和现场保护，这些问题比营销话术更直接影响结果。",
    },
  ];
}

function buildTrendSections(topic: SeoTopicCandidate) {
  if (isAiTopic(topic)) {
    return [
      {
        title: "AI 先改变的不是成交结果，而是内容生产效率",
        body: "整木门店和整木工厂开始重视 AI，不是因为它能替代销售和设计，而是因为官网内容、案例整理、产品资料和客户问答的产出效率差距正在拉大。谁先把内容做得结构化，谁就更容易持续输出。",
      },
      {
        title: "适合先用 AI 的场景，通常都在资料整理和首稿生产",
        body: "案例梳理、官网栏目文案、产品页初稿、短视频脚本提纲、客户常见问题归类，这些都是 AI 更适合先介入的场景。它的作用是加快整理速度，不是替代真实案例和专业判断。",
      },
      {
        title: "不适合完全交给 AI 的，是报价、承诺和交付判断",
        body: "整木行业的高客单项目一旦涉及工艺边界、价格承诺、交付周期和售后责任，就不能只靠 AI 自动生成。越是关键承诺，越要回到工厂、门店、设计和交付团队人工审核。",
      },
      {
        title: "传统推广效率下降，问题往往出在内容无法复用",
        body: "很多团队做推广还是靠朋友圈、单次投放或零散短内容，资料没有沉淀到官网、案例页和搜索内容里。AI 真正能补上的，是把这些碎片资料变成可持续复用的内容资产。",
      },
    ];
  }

  return [
    {
      title: "客户决策顺序已经变了",
      body: "如今高客单客户在联系门店或工厂前，会先搜整木定制、高定木作、定制家具相关问题，再看官网、案例、报价逻辑和交付表达。谁能先回答问题，谁就更容易进入下一步沟通。",
    },
    {
      title: "很多成交问题并不只是流量问题",
      body: "整木门店成交率低、报价后流失、整木工厂询盘质量差，经常不是因为没有曝光，而是内容不能支撑客户判断。客户没看到真实案例、工艺表达和预算边界，自然不敢继续推进。",
    },
    {
      title: "行业正在从关系型获客转向内容型获客",
      body: "过去更多靠熟人、招商会、朋友圈和线下关系，现在越来越多咨询来自搜索入口和内容沉淀。门店与工厂如果没有稳定的官网内容系统，就很难承接这部分高意向流量。",
    },
    {
      title: "官网内容已经不只是展示，而是筛选机制",
      body: "把案例、产品、报价、交付和常见问题写清楚，不只是为了被收录，更是为了让客户先做一轮自我筛选。这样留下来的咨询更精准，也更容易减少反复沟通。",
    },
  ];
}

function buildTechSections(topic: SeoTopicCandidate) {
  if (isAiTopic(topic)) {
    return [
      {
        title: "先整理资料，再让 AI 参与写作",
        body: "整木门店和整木工厂如果想用 AI 做推广，第一步不是直接写提示词，而是先把案例、产品、工艺、报价逻辑和交付流程整理成可复用资料。资料越清楚，AI 产出的内容越接近能用状态。",
      },
      {
        title: "官网内容、案例页和问答页，是最值得先做的三个场景",
        body: "官网内容适合用 AI 先生成栏目初稿，案例页适合用 AI 帮忙归纳项目亮点和结构，客户问答页适合用 AI 先整理高频问题。这三个场景既能提高产出效率，也能直接减少重复沟通。",
      },
      {
        title: "要给 AI 明确边界，哪些能写，哪些只能辅助",
        body: "标题草稿、首段整理、关键词归类、短视频脚本提纲、FAQ 草稿都适合 AI 辅助，但价格承诺、工艺结论、案例真实性和最终交付表达必须人工复核。边界不清，内容越多风险越大。",
      },
      {
        title: "落地时至少要有 2 到 4 个固定动作",
        body: "可以先建立案例资料表、工艺优势词表、客户高频问题库和官网页面模板，再让 AI 批量辅助生成初稿。这样做比零散地问 AI 一句写篇文章，更容易稳定产出能审核的内容。",
      },
    ];
  }

  return [
    {
      title: "内容结构先服务转化，再服务展示",
      body: "整木门店和整木工厂做官网时，首页不是最先补的，先补高意向页面更有效。案例页、产品页、报价解释页、交付流程页、常见问题页，是搜索抓取和客户决策都更需要的内容。",
    },
    {
      title: "案例页和产品页都要能被看懂",
      body: "案例页不能只放效果图，要写清户型、预算、材料、木皮、五金、收口、安装和交付难点。产品页也不能只堆参数，而要直接解释适合什么项目、差异在哪、为什么值得看。",
    },
    {
      title: "工艺优势必须翻译成客户语言",
      body: "整木工厂常见的问题是工艺很强，但表达很硬。与其写复杂术语，不如直接写清这项工艺能解决什么问题，会影响哪些交付效果，客户验收时该看什么。",
    },
    {
      title: "搜索友好和 AI 可理解，本质上是一件事",
      body: "标题、首段、分节标题和小节首句都先给结论，再展开依据，搜索和 AI 才更容易抽取。官网内容越结构化，整木门店与工厂就越容易获得稳定的抓取和引用机会。",
    },
  ];
}

function buildBody(topic: SeoTopicCandidate, answerSummary: string) {
  const links = SEO_CORE_INTERNAL_LINKS[topic.contentLine];
  const sections =
    topic.contentLine === "buying"
      ? buildBuyingSections(topic)
      : topic.contentLine === "trend"
        ? buildTrendSections(topic)
        : buildTechSections(topic);

  const summary =
    topic.contentLine === "buying"
      ? "整木选购真正要解决的，不是最低价在哪，而是预算、材料、工艺、交付和合同能不能对上。把这些判断点先看清，再谈值不值，才更不容易后悔。"
      : topic.contentLine === "trend"
        ? isAiTopic(topic)
          ? "AI 对整木推广真正有价值的地方，不是替代人，而是让官网、案例、问答和内容更新更稳定、更高效。先把适合 AI 的环节跑通，再保留人工审核，才更稳。"
          : "行业变化的核心，不只是渠道变了，而是客户判断信息的方式变了。谁先把案例、预算、产品、工艺和交付写清楚，谁就更有机会被看见、被理解、被咨询。"
        : isAiTopic(topic)
          ? "AI 方法型内容的重点，不是多用工具，而是建立资料、模板和审核流程。只要边界清楚、资料真实，AI 就能成为整木门店和工厂的内容提效工具。"
          : "技术发展类内容的关键，不是写得多，而是写得有结构、能执行、能被看懂。把整木官网内容按客户决策路径搭起来，转化和搜索理解都会更稳。";

  return (
    normalizeRichTextField(
      [
        sentence(answerSummary),
        ...sections.flatMap((section) => [heading(section.title), sentence(section.body)]),
        sentence(`${links[0]?.prompt || "相关内容可以继续参考"}<a href="${links[0]?.href || "/brands/buying"}">${links[0]?.title || "相关内容"}</a>。`),
        sentence(`${links[1]?.prompt || "如果你还想继续看"}<a href="${links[1]?.href || "/news"}">${links[1]?.title || "相关内容"}</a>。`),
        heading("总结"),
        sentence(summary),
        sentence(`${links[2]?.prompt || "如果你还想延伸看"}<a href="${links[2]?.href || "/news"}">${links[2]?.title || "相关内容"}</a>。`),
      ].join(""),
    ) || ""
  );
}

function buildArticle(topic: SeoTopicCandidate, batchId: string): GeneratedSeoArticle {
  const answerSummary = buildAnswerSummary(topic);
  const excerpt = buildExcerpt(topic, answerSummary);
  const faqPairs = buildFaqPairs(topic);
  const keyFacts = buildKeyFacts(topic);
  const claimCheckHints = buildClaimCheckHints(topic);
  const entityTerms = Array.from(
    new Set(
      [topic.themeLabel, topic.entityLabel, topic.keywordSeed]
        .concat(
          keyFacts.join(" ").match(
            /整木定制|高定木作|定制家具|整木工厂|整木门店|护墙板|木门|柜体|板材|木皮|五金|收口|安装|交付|预算|官网|案例|询盘|AI/g,
          ) || [],
        ),
    ),
  ).slice(0, 12);
  const content = buildBody(topic, answerSummary);

  return {
    title: topic.title,
    excerpt,
    keywords: buildKeywords(topic),
    content,
    slug: "",
    internalLinks: SEO_CORE_INTERNAL_LINKS[topic.contentLine].slice(0, 3).map((item) => ({
      title: item.title,
      href: item.href,
      prompt: item.prompt,
    })),
    status: "pending",
    publishedAt: null,
    sourceType: "ai_generated",
    source: SEO_AUTOGEN_SOURCE,
    generationBatchId: batchId,
    keywordSeed: topic.keywordSeed,
    keywordIntent: topic.keywordIntent,
    answerSummary,
    faqPairs,
    keyFacts,
    entityTerms,
    claimCheckHints,
    contentLine: topic.contentLine,
    section: topic.sectionLabel,
    category: topic.categoryLabel,
    subCategory: topic.subCategoryLabel,
    categoryHref: topic.categoryHref,
    subHref: topic.subHref,
    contentHash: buildSeoContentHash(topic.title, content),
  };
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
      "SEO 双线样稿命中脏词拦截",
    );

    const slug = await generateUniqueArticleSlug(article.title);
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
        content: article.content,
        contentHash: article.contentHash,
        categoryHref: article.categoryHref,
        subHref: article.subHref,
        sectionLabel: article.section,
        categoryLabel: article.category,
        subCategoryLabel: article.subCategory,
        entityTerms: article.entityTerms.join(","),
        claimCheckHints: article.claimCheckHints.join("\n"),
        faqPairsJson: JSON.stringify(article.faqPairs),
        keyFactsJson: JSON.stringify(article.keyFacts),
        faqJson: JSON.stringify(article.faqPairs),
        manualKeywords: article.keywords,
        status: "pending",
        publishedAt: null,
        reviewNote: `dual-line seo draft | batch=${article.generationBatchId} | line=${article.contentLine} | seed=${article.keywordSeed} | intent=${article.keywordIntent}`,
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

  if (approved) {
    throw new Error("Dual-line SEO generator does not support auto-approved publishing");
  }
  if (!dryRun && process.env.SEO_NEWS_AUTOGEN_ENABLED !== "true") {
    throw new Error("SEO dual-line generation is temporarily disabled");
  }

  const batchId = `dual-seo-${new Date().toISOString().slice(0, 10)}-${createHash("md5").update(String(Date.now())).digest("hex").slice(0, 6)}`;
  const [{ picked, candidates, stats }, existingArticles] = await Promise.all([pickSeoTopicsForGeneration(count), loadExistingArticles()]);

  const generated: GeneratedSeoArticle[] = [];
  for (const topic of picked) {
    const article = buildArticle(topic, batchId);
    const leadDupReason = findSeoLeadDuplicateReason(article.content, existingArticles, { similarityThreshold: 0.992 });
    if (leadDupReason) continue;
    article.slug = await generateUniqueArticleSlug(article.title);
    generated.push(article);
  }

  if (dryRun) {
    return {
      dryRun: true,
      approved,
      timezone,
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
        suffixDupRiskScore: item.suffixDupRiskScore,
        titlePatternDiversityScore: item.titlePatternDiversityScore,
      })),
      items: generated,
    };
  }

  const saved = await persistGeneratedArticles(generated);
  return {
    dryRun: false,
    approved,
    timezone,
    generationBatchId: batchId,
    stats,
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
