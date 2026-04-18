import { prisma } from "../lib/prisma";
import { SEO_KEYWORD_SEEDS, type SeoKeywordSeed } from "../lib/seo-keyword-seeds";
import { generateUniqueArticleSlug } from "../lib/slug";
import type { BodySkeleton, SeoTopicCandidate } from "../lib/seo-topic-generator";
import { buildArticle } from "./generate-seo-news";

type RewritePlan = {
  title: string;
  titleStyle: SeoTopicCandidate["titleStyle"];
  titleFrame: string;
  bodySkeleton: BodySkeleton;
};

const REWRITE_PLAN: Record<string, RewritePlan> = {
  "整木定制价格::报价": {
    title: "为什么整木定制价格差这么多？核心成本在这里",
    titleStyle: "contrast",
    titleFrame: "pricing_gap_reason",
    bodySkeleton: "pricing_compare",
  },
  "整木定制价格::多少钱": {
    title: "整木定制价格怎么判断？不同方案的花费差在哪",
    titleStyle: "question",
    titleFrame: "price_question_gap",
    bodySkeleton: "pricing_compare",
  },
  "整木定制预算::多少钱": {
    title: "整木定制预算一般多少？100㎡真实花费拆解",
    titleStyle: "scene",
    titleFrame: "budget_real_cost",
    bodySkeleton: "scenario_solution",
  },
  "整木工厂获客::怎么接单": {
    title: "整木工厂怎么接单？先把网站里的高意向问题讲清楚",
    titleStyle: "question",
    titleFrame: "factory_order_high_intent_content",
    bodySkeleton: "decision_guide",
  },
  "整木工厂获客::获客": {
    title: "整木工厂获客为什么总没效果？问题常出在内容入口",
    titleStyle: "contrast",
    titleFrame: "factory_leads_content_entry",
    bodySkeleton: "industry_cognition",
  },
};

function findSeed(phrase: string): SeoKeywordSeed | null {
  return SEO_KEYWORD_SEEDS.find((item) => item.phrase === phrase) ?? null;
}

function buildTopic(seed: SeoKeywordSeed, keywordIntent: string, plan: RewritePlan): SeoTopicCandidate {
  return {
    title: plan.title,
    slug: "",
    keywordSeed: seed.phrase,
    keywordIntent,
    titleStyle: plan.titleStyle,
    titleFrame: plan.titleFrame,
    bodySkeleton: plan.bodySkeleton,
    userIntentLine: `${seed.phrase} ${keywordIntent}`.trim(),
    audience: seed.intent,
    group: seed.group,
    score: 100,
    dedupReason: null,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");

  const rows = await prisma.article.findMany({
    where: {
      sourceType: "ai_generated",
      status: "pending",
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      generationBatchId: true,
      keywordSeed: true,
      keywordIntent: true,
    },
  });

  const results: Array<{
    id: string;
    oldTitle: string;
    newTitle: string;
    oldSlug: string;
    newSlug: string;
    matchedRule: string;
    bodySkeleton: BodySkeleton;
  }> = [];

  for (const row of rows) {
    if (!row.keywordSeed || !row.keywordIntent) continue;
    const key = `${row.keywordSeed}::${row.keywordIntent}`;
    const plan = REWRITE_PLAN[key];
    if (!plan) continue;

    const seed = findSeed(row.keywordSeed);
    if (!seed) continue;

    const topic = buildTopic(seed, row.keywordIntent, plan);
    const article = buildArticle(topic, row.generationBatchId ?? `refresh-${new Date().toISOString().slice(0, 10)}`);
    const newSlug = await generateUniqueArticleSlug(article.title);

    results.push({
      id: row.id,
      oldTitle: row.title,
      newTitle: article.title,
      oldSlug: row.slug,
      newSlug,
      matchedRule: key,
      bodySkeleton: topic.bodySkeleton,
    });

    if (dryRun) continue;

    await prisma.article.update({
      where: { id: row.id },
      data: {
        title: article.title,
        slug: newSlug,
        excerpt: article.excerpt,
        content: article.content,
        contentHash: article.contentHash,
        manualKeywords: article.keywords,
        reviewNote: `SEO草稿已按新规则重写；种子词 ${row.keywordSeed}；意图 ${row.keywordIntent}；titleStyle=${topic.titleStyle}；titleFrame=${topic.titleFrame}；bodySkeleton=${topic.bodySkeleton}`,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        matchedCount: results.length,
        items: results,
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
