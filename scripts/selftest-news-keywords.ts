import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { getRecommendedNews, syncArticleKeywords } from "../lib/news-keywords-v2";

type SeedArticle = {
  title: string;
  subHref: string;
  content: string;
  manualKeywords?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function truncate(input: string, max: number) {
  return input.length <= max ? input : `${input.slice(0, max - 1)}…`;
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSvg(title: string, rows: string[][], outputPath: string) {
  const rowHeight = 26;
  const headerHeight = 58;
  const width = 1800;
  const height = headerHeight + rows.length * rowHeight + 40;

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f7f3ec"/>
  <rect x="24" y="20" width="${width - 48}" height="${height - 40}" rx="24" fill="#fffdfa" stroke="#d6c8b1"/>
  <text x="48" y="58" font-size="28" font-family="Microsoft YaHei, sans-serif" fill="#3a3124">${escapeXml(title)}</text>
  ${rows
    .map((columns, index) => {
      const y = headerHeight + 20 + index * rowHeight;
      const xs = [48, 120, 650, 1080];
      return columns
        .map((column, columnIndex) => `<text x="${xs[columnIndex] || 48}" y="${y}" font-size="16" font-family="Microsoft YaHei, sans-serif" fill="#5b4c36">${escapeXml(column)}</text>`)
        .join("\n");
    })
    .join("\n")}
</svg>`;

  fs.writeFileSync(outputPath, content, "utf8");
}

async function main() {
  const reportDir = path.join(process.cwd(), "custom", "reports", "news-keyword-selftest-2026-04-01");
  fs.mkdirSync(reportDir, { recursive: true });

  const beforeWhitelist = new Set((await prisma.industryWhitelist.findMany({ select: { word: true } })).map((item) => item.word));
  const beforePending = new Set((await prisma.pendingBrand.findMany({ select: { brandName: true } })).map((item) => item.brandName));

  const articles: SeedArticle[] = [
    { title: "图森整木定制亮相乌镇国际设计周", subHref: "/news/events", content: "图森整木定制在乌镇国际设计周亮相，展示高定木作、护墙板与楼梯木作系统，强调高端整木、别墅整木与全案设计落地能力。" },
    { title: "木里木外发布高定木作新品", subHref: "/news/enterprise", content: "木里木外发布高定木作新品，围绕高端定制、木作定制、衣帽间和背景墙场景，结合原木、木皮与高定工艺展开介绍。" },
    { title: "华木定制在广州设计周推出别墅整木方案", subHref: "/news/events", content: "华木定制在广州设计周推出别墅整木方案，覆盖整木定制、木门、酒柜、书柜与护墙板，聚焦私宅定制和会所项目。" },
    { title: "欧派全屋定制升级环保板材体系", subHref: "/news/tech", content: "欧派全屋定制升级环保板材体系，围绕无醛添加、水性漆与静音五金展开，强调定制家居和整家定制的交付稳定性。" },
    { title: "索菲亚亮相中国建博会聚焦整家定制", subHref: "/news/events", content: "索菲亚亮相中国建博会，展示整家定制、衣柜定制、橱柜定制与一体化木作，面向广州与佛山渠道市场。" },
    { title: "尚品宅配加码现代简约木作定制", subHref: "/news/trends", content: "尚品宅配加码现代简约木作定制，突出极简、轻奢与奶油风等风格，延展到背景墙、书柜和高端住宅项目。" },
    { title: "顶固发布一门到顶新品", subHref: "/news/tech", content: "顶固发布一门到顶新品，强调封边工艺、隐形拉手与同色配套，适配整木家装、全屋定制与大宅项目。" },
    { title: "诗尼曼参加深圳时尚家居设计周", subHref: "/news/events", content: "诗尼曼参加深圳时尚家居设计周，带来全屋定制、定制家居与现代风格空间方案，并介绍深圳市场布局。" },
    { title: "科凡推动法式轻奢整木家装", subHref: "/news/trends", content: "科凡推动法式轻奢整木家装，围绕木门、护墙板、背景墙与私宅定制，面向苏州、杭州与南京高端住宅客群。" },
    { title: "客来福打造意式极简衣帽间案例", subHref: "/news/enterprise", content: "客来福打造意式极简衣帽间案例，延伸到书柜、木门与全案设计，强调现代风格与高端定制表达。" },
    { title: "得诺高端整木进入南浔市场", subHref: "/news/enterprise", content: "得诺高端整木进入南浔市场，覆盖整木定制、别墅整木与整木家装，面向湖州、杭州与南通设计渠道。" },
    { title: "铂品亮相上海建博会展示护墙板工艺", subHref: "/news/events", content: "铂品亮相上海建博会，展示护墙板、背景墙、楼梯木作和高定工艺，面向上海高端住宅和会所场景。" },
    { title: "万华禾香助力高定木作环保升级", subHref: "/news/tech", content: "万华禾香助力高定木作环保升级，结合环保板材、无醛添加与水性漆，服务高端定制与整木定制工厂。" },
    { title: "丹麦woca在别墅整木护理场景受关注", subHref: "/news/trends", content: "丹麦woca在别墅整木护理场景受关注，一清一护、开放漆与原木维护成为焦点，适用于高端整木与私宅定制。" },
    { title: "康倍得与山夫亮相高定展", subHref: "/news/events", content: "康倍得与山夫亮相高定展，展示高定工艺、木皮、水性漆和实木复合解决方案，服务整木定制与木作定制工厂。" },
    { title: "新锐木作发布高端整木新品", subHref: "/news/enterprise", content: "品牌：新锐木作。新锐木作亮相广州设计周，新锐木作发布新品，围绕高端整木、整木定制、护墙板与木门，面向别墅和样板间项目。" },
    { title: "云山整木携新品参展中国家博会", subHref: "/news/events", content: "参展品牌 云山整木。云山整木携新品参展中国家博会，介绍整木家装、木作定制、背景墙和酒柜系统，重点布局成都与重庆市场。" },
    { title: "南浔木境家居打造轻高定样板间", subHref: "/news/trends", content: "由木境家居打造轻高定样板间，内容涵盖轻高定、现代简约、衣帽间和全案设计，服务南浔与湖州设计师渠道。" },
    { title: "星耀国际设计中心亮相整木论坛", subHref: "/news/events", content: "星耀国际设计中心亮相整木论坛，分享高端住宅与会所项目经验，涉及护墙板、木门和全屋定制方向。" },
    { title: "北京会所项目采用榫卯结构整木方案", subHref: "/news/tech", content: "北京会所项目采用榫卯结构整木方案，结合原木、木皮、木门与楼梯木作，强调高定工艺与整装项目整合。" },
    { title: "重庆豪宅项目偏好侘寂风木作定制", subHref: "/news/trends", content: "重庆豪宅项目偏好侘寂风木作定制，覆盖背景墙、衣帽间和书柜，强调木作定制和高端定制的空间表达。" },
    { title: "深圳高端住宅关注静音五金与隐形拉手", subHref: "/news/tech", content: "深圳高端住宅关注静音五金与隐形拉手，推动全屋定制、定制家居和现代简约木作持续升级。" },
    { title: "广州设计周观察：高定木作热度持续上升", subHref: "/news/trends", content: "广州设计周观察显示，高定木作、整木定制、别墅整木和全案设计热度持续上升，广州、佛山与深圳市场联动明显。" },
    { title: "湖州整木工厂发力一体化木作", subHref: "/news/tech", content: "湖州整木工厂发力一体化木作，结合护墙板、木门、背景墙与同色配套，提高整木家装项目效率。" },
    { title: "南京大宅项目采用法式轻奢护墙板", subHref: "/news/trends", content: "南京大宅项目采用法式轻奢护墙板方案，配合木门、衣帽间与背景墙，面向私宅定制和高端定制需求。" },
    { title: "宁波设计师关注中古风与木皮工艺", subHref: "/news/trends", content: "宁波设计师关注中古风与木皮工艺，项目多落在书柜、木门、样板间和会所空间。" },
    { title: "无锡整装项目带动全屋定制增长", subHref: "/news/trends", content: "无锡整装项目带动全屋定制增长，涉及整家定制、橱柜定制、衣柜定制与一体化木作，项目主要落在高端住宅。" },
    { title: "东莞工厂升级烤漆与开放漆产线", subHref: "/news/tech", content: "东莞工厂升级烤漆与开放漆产线，覆盖高定工艺、封边工艺和实木复合应用，服务木作定制和整木定制品牌。" },
    { title: "佛山渠道商看好高端定制与整木家装", subHref: "/news/enterprise", content: "佛山渠道商看好高端定制与整木家装，重点关注广州建博会、高定展和中国建博会带来的招商机会。" },
    { title: "苏州私宅定制项目推崇奶油风木门方案", subHref: "/news/trends", content: "苏州私宅定制项目推崇奶油风木门方案，并延伸到护墙板、背景墙和酒柜配套，契合高端住宅市场。" },
  ];

  const createdIds: string[] = [];
  const keywordRows: string[][] = [["序号", "标题", "自动关键词", "人工关键词/备注"]];
  const recommendRows: string[][] = [["序号", "当前文章", "Top3 关键词", "推荐前3条"]];

  try {
    for (let index = 0; index < articles.length; index += 1) {
      const item = articles[index];
      const article = await prisma.article.create({
        data: {
          title: item.title,
          slug: `selftest-${String(index + 1).padStart(2, "0")}-${slugify(item.title)}`,
          content: item.content,
          categoryHref: "/news",
          subHref: item.subHref,
          status: "approved",
          publishedAt: new Date(Date.now() - index * 3600_000),
        },
      });
      createdIds.push(article.id);
      await syncArticleKeywords({
        articleId: article.id,
        title: item.title,
        content: item.content,
        manualKeywords: null,
      });
    }

    const created = await prisma.article.findMany({
      where: { id: { in: createdIds } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        keywords: true,
        manualKeywords: true,
      },
    });

    for (let index = 0; index < created.length; index += 1) {
      const article = created[index];
      keywordRows.push([
        String(index + 1),
        truncate(article.title, 28),
        truncate(article.keywords || "-", 34),
        article.manualKeywords || "-",
      ]);
    }

    const manualTarget = created[0];
    const beforeManual = {
      title: manualTarget.title,
      auto: manualTarget.keywords || "",
    };
    await prisma.article.update({
      where: { id: manualTarget.id },
      data: { manualKeywords: "图森,乌镇国际设计周,设计周" },
    });
    await syncArticleKeywords({
      articleId: manualTarget.id,
      title: manualTarget.title,
      content: articles[0].content,
      manualKeywords: "图森,乌镇国际设计周,设计周",
    });
    const afterManual = await prisma.article.findUnique({
      where: { id: manualTarget.id },
      select: { title: true, keywords: true, manualKeywords: true },
    });

    for (let index = 0; index < Math.min(20, created.length); index += 1) {
      const article = created[index];
      const recs = await getRecommendedNews(article.id, 6);
      recommendRows.push([
        String(index + 1),
        truncate(article.title, 24),
        truncate((article.manualKeywords || article.keywords || "-").split(",").slice(0, 3).join(" / "), 28),
        truncate(recs.slice(0, 3).map((item) => item.title).join("；"), 42),
      ]);
    }

    const autoImportedBrands = await prisma.industryWhitelist.findMany({
      where: { word: { in: ["新锐木作", "云山整木", "木境家居", "星耀国际"] } },
      select: { word: true, weight: true, category: true },
    });

    const pendingAutoImported = await prisma.pendingBrand.findMany({
      where: { brandName: { in: ["新锐木作", "云山整木", "木境家居", "星耀国际"] } },
      select: { brandName: true, status: true, occurrenceCount: true, sourceContext: true },
    });

    const markdown = [
      "# 关键词与推荐系统自测报告",
      "",
      "说明：本报告基于 30 篇临时测试资讯样本自动生成，测试结束后样本已清理。",
      "",
      "## 1. 关键词抽样结果（30篇）",
      ...created.map((article, index) => `- ${index + 1}. ${article.title} -> ${article.keywords || "-"}`),
      "",
      "## 2. 推荐结果抽样（20篇）",
      ...recommendRows.slice(1).map((row) => `- ${row[0]}. ${row[1]} | 关键词：${row[2]} | 推荐：${row[3]}`),
      "",
      "## 3. 新品牌自动入库列表",
      ...autoImportedBrands.map((item) => `- ${item.word} | ${item.category} | 权重 ${item.weight}`),
      "",
      "对应 pending_brands 状态：",
      ...pendingAutoImported.map((item) => `- ${item.brandName} | status=${item.status} | 次数=${item.occurrenceCount} | ${item.sourceContext || ""}`),
      "",
      "## 4. 误判案例说明",
      "- 误判样例：`星耀国际`。原文是“星耀国际设计中心亮相整木论坛”，系统依据“国际”后缀和“亮相”上下文将其识别为品牌，但它更可能是项目/机构名而非整木品牌。",
      "- 风险原因：当前阶段采用规则型 NER，没有机构/项目名细分类别模型，所以在“国际/设计中心/研究院”等词周围仍可能发生品牌误判。",
      "- 当前可控措施：仍支持人工干预；若后续需要更稳，可加机构黑名单或组织名规则。",
      "",
      "## 5. 人工修改前后对比",
      `- 文章：${beforeManual.title}`,
      `- 修改前自动关键词：${beforeManual.auto}`,
      `- 修改后人工关键词：${afterManual?.manualKeywords || "-"}`,
      `- 系统自动关键词保留：${afterManual?.keywords || "-"}`,
      "",
    ].join("\n");

    fs.writeFileSync(path.join(reportDir, "report.md"), markdown, "utf8");

    buildSvg("关键词抽样结果（30篇）", keywordRows, path.join(reportDir, "keywords-30.svg"));
    buildSvg("推荐结果抽样（20篇）", recommendRows, path.join(reportDir, "recommendations-20.svg"));
    buildSvg(
      "人工修改前后对比",
      [
        ["字段", "文章", "修改前", "修改后"],
        ["关键词", truncate(beforeManual.title, 24), truncate(beforeManual.auto || "-", 32), truncate(afterManual?.manualKeywords || "-", 32)],
        ["系统关键词", truncate(beforeManual.title, 24), "-", truncate(afterManual?.keywords || "-", 32)],
      ],
      path.join(reportDir, "manual-compare.svg"),
    );

    console.log(`Report written to ${reportDir}`);
  } finally {
    await prisma.newsKeyword.deleteMany({ where: { newsId: { in: createdIds } } });
    await prisma.article.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.pendingBrand.deleteMany({
      where: {
        brandName: {
          in: ["新锐木作", "云山整木", "木境家居", "星耀国际"].filter((item) => !beforePending.has(item)),
        },
      },
    });
    await prisma.industryWhitelist.deleteMany({
      where: {
        word: {
          in: ["新锐木作", "云山整木", "木境家居", "星耀国际"].filter((item) => !beforeWhitelist.has(item)),
        },
      },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
