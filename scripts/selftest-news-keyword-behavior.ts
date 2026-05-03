import { prisma } from "../lib/prisma";
import { extractNewsKeywords, syncArticleKeywords } from "../lib/news-keywords-v2";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasKeyword(list: string[], target: string) {
  return list.some((item) => item.toLowerCase() === target.toLowerCase());
}

async function main() {
  const article = {
    title: "WOCA and AURAWOOD product update for wood care",
    content:
      "WOCA appears in the title and WOCA appears again in the body. woca is mentioned with AURAWOOD and NORDCARE as imported product and brand examples for wood care, cleaning product, and floor care. This article also mentions Bona and Osmo in product context.",
  };

  const extracted = await extractNewsKeywords(article);
  const extractedKeywords = extracted.keywords.map((item) => item.keyword);

  assert(extracted.pendingBrands.length === 0, "pendingBrands should stay empty");
  assert(hasKeyword(extractedKeywords, "WOCA"), "WOCA should be extracted as a keyword");
  assert(
    extractedKeywords.some((item) => ["aurawood", "nordcare", "bona", "osmo"].includes(item.toLowerCase())),
    "new product or brand keywords should be extracted",
  );

  const beforePendingCount = await prisma.pendingBrand.count();
  const created = await prisma.article.create({
    data: {
      title: article.title,
      slug: `selftest-disable-pending-brand-${Date.now()}`,
      content: article.content,
      categoryHref: "/news",
      subHref: "/news/aftermarket",
      status: "approved",
      publishedAt: new Date(),
    },
    select: { id: true },
  });

  try {
    await syncArticleKeywords({
      articleId: created.id,
      title: article.title,
      content: article.content,
      manualKeywords: null,
    });

    const saved = await prisma.article.findUnique({
      where: { id: created.id },
      select: { keywords: true, manualKeywords: true },
    });
    const afterPendingCount = await prisma.pendingBrand.count();
    const savedKeywords = (saved?.keywords || "").split(",").map((item) => item.trim()).filter(Boolean);

    assert(afterPendingCount === beforePendingCount, "syncArticleKeywords should not create pending brands");
    assert(saved?.manualKeywords == null, "manual keywords should remain unchanged");
    assert(savedKeywords.length > 0, "auto keywords should be saved");
    assert(hasKeyword(savedKeywords, "WOCA"), "saved keywords should retain WOCA");
  } finally {
    await prisma.newsKeyword.deleteMany({ where: { newsId: created.id } });
    await prisma.article.delete({ where: { id: created.id } });
    await prisma.$disconnect();
  }

  console.log("news keyword behavior selftest passed");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
