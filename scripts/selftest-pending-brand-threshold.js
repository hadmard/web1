const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetBrand(brandName) {
  await prisma.pendingBrand.deleteMany({ where: { brandName } });
  await prisma.industryWhitelist.deleteMany({ where: { word: brandName } });
}

async function getState(brandName) {
  const pending = await prisma.pendingBrand.findUnique({ where: { brandName } });
  const whitelist = await prisma.industryWhitelist.findMany({ where: { word: brandName } });
  return {
    pendingStatus: pending?.status ?? null,
    occurrenceCount: pending?.occurrenceCount ?? null,
    articleCount: pending?.articleCount ?? null,
    articleIds: pending?.articleIds ? JSON.parse(pending.articleIds) : [],
    approvedSource: pending?.approvedSource ?? null,
    inWhitelist: whitelist.length > 0,
    whitelistCount: whitelist.length,
    whitelistWeight: whitelist[0]?.weight ?? null,
  };
}

async function applyThreshold(articleId, brandName, frequency, sourceContext) {
  const existing = await prisma.pendingBrand.findUnique({ where: { brandName } });
  const existingArticleIds = existing?.articleIds ? JSON.parse(existing.articleIds) : [];
  const mergedArticleIds = Array.from(new Set([...existingArticleIds, articleId]));
  const nextArticleCount = mergedArticleIds.length;
  const nextOccurrenceCount = (existing?.occurrenceCount || 0) + frequency;
  const shouldAutoApprove = frequency >= 2 || nextArticleCount >= 2;

  if (existing) {
    await prisma.pendingBrand.update({
      where: { brandName },
      data: {
        lastNewsId: articleId,
        occurrenceCount: nextOccurrenceCount,
        articleCount: nextArticleCount,
        articleIds: JSON.stringify(mergedArticleIds),
        lastOccurrence: new Date(),
        sourceContext,
        ruleSource: "selftest-threshold",
        confidence: 0.72,
        status: shouldAutoApprove ? 1 : existing.status,
        approvedSource: existing?.approvedSource === "manual-admin" ? "manual-admin" : shouldAutoApprove ? "auto-threshold" : existing.approvedSource,
        autoApprovedAt: shouldAutoApprove ? new Date() : existing.autoApprovedAt,
      },
    });
  } else {
    await prisma.pendingBrand.create({
      data: {
        brandName,
        firstNewsId: articleId,
        lastNewsId: articleId,
        occurrenceCount: frequency,
        articleCount: 1,
        articleIds: JSON.stringify([articleId]),
        lastOccurrence: new Date(),
        sourceContext,
        ruleSource: "selftest-threshold",
        confidence: 0.72,
        status: shouldAutoApprove ? 1 : 0,
        approvedSource: shouldAutoApprove ? "auto-threshold" : null,
        autoApprovedAt: shouldAutoApprove ? new Date() : null,
      },
    });
  }

  if (shouldAutoApprove) {
    await prisma.industryWhitelist.upsert({
      where: { word: brandName },
      update: { category: "品牌", weight: 1, status: true },
      create: { word: brandName, category: "品牌", weight: 1, status: true },
    });
  }
}

async function runCase(brandName, steps) {
  await resetBrand(brandName);
  for (const step of steps) {
    if (step.type === "threshold") {
      await applyThreshold(step.articleId, brandName, step.frequency, step.sourceContext);
    }
    if (step.type === "manualApprove") {
      await prisma.pendingBrand.update({
        where: { brandName },
        data: { status: 1, approvedSource: "manual-admin" },
      });
      await prisma.industryWhitelist.upsert({
        where: { word: brandName },
        update: { category: "品牌", weight: 1, status: true },
        create: { word: brandName, category: "品牌", weight: 1, status: true },
      });
    }
  }
  const state = await getState(brandName);
  await resetBrand(brandName);
  return state;
}

async function main() {
  const results = {
    sameArticleOnce: await runCase("阈值样例甲", [
      { type: "threshold", articleId: "article-a", frequency: 1, sourceContext: "品牌：阈值样例甲 亮相" },
    ]),
    sameArticleTwice: await runCase("阈值样例乙", [
      { type: "threshold", articleId: "article-a", frequency: 2, sourceContext: "品牌：阈值样例乙 发布新品，阈值样例乙 亮相" },
    ]),
    crossArticleTwice: await runCase("阈值样例丙", [
      { type: "threshold", articleId: "article-a", frequency: 1, sourceContext: "品牌：阈值样例丙 亮相" },
      { type: "threshold", articleId: "article-b", frequency: 1, sourceContext: "参展品牌 阈值样例丙" },
    ]),
    manualApprovedThenSeenAgain: await runCase("阈值样例丁", [
      { type: "threshold", articleId: "article-a", frequency: 1, sourceContext: "品牌：阈值样例丁 亮相" },
      { type: "manualApprove" },
      { type: "threshold", articleId: "article-b", frequency: 1, sourceContext: "参展品牌 阈值样例丁" },
    ]),
    articleIdsDeduped: await runCase("阈值样例戊", [
      { type: "threshold", articleId: "article-a", frequency: 1, sourceContext: "品牌：阈值样例戊 亮相" },
      { type: "threshold", articleId: "article-a", frequency: 1, sourceContext: "品牌：阈值样例戊 再次出现" },
    ]),
  };

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await Promise.all([
    resetBrand("阈值样例甲").catch(() => {}),
    resetBrand("阈值样例乙").catch(() => {}),
    resetBrand("阈值样例丙").catch(() => {}),
    resetBrand("阈值样例丁").catch(() => {}),
    resetBrand("阈值样例戊").catch(() => {}),
  ]);
  await prisma.$disconnect();
  process.exit(1);
});

