import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categories as staticCategories } from "../lib/site-structure";

const prisma = new PrismaClient();

const categoryDefinitions: Record<string, { definitionText: string; versionLabel?: string; versionYear?: number; relatedTermSlugs?: string[]; faqs: { q: string; a: string }[] }> = {
  "/news": {
    definitionText: "本栏目用于发布整木行业趋势、企业动态、技术更新与行业活动信息，供从业者与关注者了解行业在发生什么。",
    versionLabel: "2026版",
    versionYear: 2026,
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "整木资讯包含哪些内容？", a: "行业趋势、企业动态、技术更新、行业活动（展会报道、论坛纪要、协会活动）等。" },
      { q: "资讯如何与主站同步？", a: "会员可在「资讯发布」模块自主上传，经审核后同步至主站对应栏目。" },
    ],
  },
  "/market": {
    definitionText: "本栏目用于结构化展示整木品牌定位、材料体系与商业模式，供行业参考与对比使用，满足「我该选谁」的决策需求。",
    versionLabel: "2026版",
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "整木市场如何帮助选品牌？", a: "提供品牌选择、品类选择、区域品牌与整木行情等子栏目，便于对比与决策。" },
    ],
  },
  "/dictionary": {
    definitionText: "本栏目为整木行业概念解释库，涵盖基础概念、技术术语、商业模式与行业角色等，满足「这个词是什么意思」的查阅与 AI 引用需求。",
    versionLabel: "2026版",
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "词条如何参与共建？", a: "会员可参与标准共建与词条建议，经审核后纳入词库。" },
    ],
  },
  "/standards": {
    definitionText: "本栏目发布整木行业材料、工艺、服务等分级与标准，以及标准共建与草案公示，建立长期权威性。",
    versionLabel: "2026版",
    versionYear: 2026,
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "整木工艺如何分级？", a: "参见工艺标准下的涂装等级、拼接标准、安装标准等子栏目。" },
      { q: "木皮等级如何判断？", a: "参见材料标准下的木皮等级、板材等级等子栏目。" },
    ],
  },
  "/data": {
    definitionText: "本栏目提供整木行业规模、区域分布、行业调研与年度报告等数据，满足「行业到底有多大」的认知需求。",
    versionLabel: "2025年统计",
    versionYear: 2025,
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "数据来源与口径？", a: "参见各报告或数据页的「来源」「方法论」说明。" },
    ],
  },
  "/awards": {
    definitionText: "本栏目发布行业评选、区域榜单与评选规则，作为权威信任入口，强化可信度。",
    versionLabel: "2026版",
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "评选规则如何查看？", a: "参见评选规则下的评分维度、审核流程、公示制度。" },
    ],
  },
  "/gallery": {
    definitionText: "本栏目为整木行业视觉数据库，按风格、工艺、空间分类展示，满足「想看效果」的需求；企业专属图库为会员上传专区。",
    versionLabel: "2026版",
    relatedTermSlugs: ["zhengmu"],
    faqs: [
      { q: "企业图库如何上传？", a: "会员登录后在「图片管理」中分类创建、批量上传，可同步至图库。" },
    ],
  },
  "/membership": {
    definitionText: "会员系统为企业自运营后台与内容共建入口，包含企业资料管理、资讯发布、图片管理与内容审核状态等模块。",
    faqs: [
      { q: "如何成为会员？", a: "可通过站点注册或联系运营申请；企业资料、资讯与图库需登录后使用。" },
    ],
  },
};

async function main() {
  await prisma.term.upsert({
    where: { slug: "zhengmu" },
    update: {},
    create: {
      title: "整木",
      slug: "zhengmu",
      definition: "整木是指以实木或实木复合为主要材料，通过一体化设计、生产与安装，形成门、墙板、柜体、吊顶等室内木作系统的产品与产业形态。",
      background: "伴随消费升级与整装需求兴起，整木概念自定制木门、整木家装等演变而来。",
      features: "一体化、可定制、材料与风格统一。",
      structure: "门、墙板、柜体、线条、装饰件等模块化组合。",
      significance: "代表木作行业从单品向系统化、高端定制发展。",
      version: "1.0",
    },
  });

  const demoHash = await bcrypt.hash("demo123", 10);
  await prisma.member.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "演示会员",
      passwordHash: demoHash,
      role: "MEMBER",
      membershipLevel: "basic",
    },
  });

  const adminHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD ?? "admin123", 10);
  await prisma.member.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "主账号",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      membershipLevel: "admin",
    },
  });

  const existing = await prisma.category.count();
  if (existing === 0) {
    for (let i = 0; i < staticCategories.length; i++) {
      const c = staticCategories[i];
      const meta = categoryDefinitions[c.href];
      const cat = await prisma.category.create({
        data: {
          href: c.href,
          title: c.title,
          desc: c.desc,
          definitionText: meta?.definitionText ?? null,
          versionLabel: meta?.versionLabel ?? null,
          versionYear: meta?.versionYear ?? null,
          relatedTermSlugs: meta?.relatedTermSlugs ? JSON.stringify(meta.relatedTermSlugs) : null,
          sortOrder: i,
          subcategories: {
            create: c.subcategories.map((s, j) => ({
              href: s.href,
              label: s.label,
              groupLabel: s.groupLabel ?? null,
              sortOrder: j,
            })),
          },
        },
      });
      if (meta?.faqs?.length) {
        await prisma.categoryFaq.createMany({
          data: meta.faqs.map((f, j) => ({
            categoryId: cat.id,
            question: f.q,
            answer: f.a,
            sortOrder: j,
          })),
        });
      }
      console.log("Created category:", cat.title);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
