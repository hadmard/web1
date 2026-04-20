export const YOUXUAN_H5_URL = "https://csj.cnzhengmu.com/h5/index.html?id=1#/";

export type YouxuanCategory = {
  slug: string;
  label: string;
  eyebrow: string;
  description: string;
  highlight: string;
};

export const YOUXUAN_CATEGORIES: YouxuanCategory[] = [
  {
    slug: "books",
    label: "行业书籍",
    eyebrow: "专业阅读",
    description: "聚焦整木定制、工艺体系与经营方法的行业精选书单，适合老板、操盘手与设计管理者。",
    highlight: "适合知识沉淀与团队培训",
  },
  {
    slug: "care",
    label: "清洁护理",
    eyebrow: "木作养护",
    description: "面向木作清洁、保养与交付维护场景的护理产品，强调专业度、稳定性与长期使用体验。",
    highlight: "适合售后服务与交付配套",
  },
  {
    slug: "featured",
    label: "热门推荐",
    eyebrow: "优选组合",
    description: "将当前更适合行业用户下单的产品集中展示，降低决策成本，帮助用户更快完成转化。",
    highlight: "适合首次进入商城的用户",
  },
];

export const YOUXUAN_NAME = "整木优选";

export const YOUXUAN_NAME_OPTIONS = [
  {
    name: "整木臻选",
    style: "更偏精品馆气质，强调甄选感和质感，适合高端行业门户。",
  },
  {
    name: "整木精选馆",
    style: "更偏频道化和内容型电商，适合做长期稳定的门户内商城入口。",
  },
  {
    name: "整木书养",
    style: "更聚焦书籍与护理两类商品，辨识度强，但业务扩展性略弱。",
  },
];

export const YOUXUAN_COPY_VARIANTS = [
  {
    title: "把行业阅读与木作养护，放进同一个专业采购入口",
    description:
      "整木优选聚焦行业书籍、木作护理与专业精选，用更克制的频道化体验，让用户在浏览内容时自然进入购买场景。",
  },
  {
    title: "不是促销卖场，而是整木行业的精选补给站",
    description:
      "从知识工具到交付护理，整木优选围绕从业者真实使用场景组织商品，让下单更像一次专业补货，而不是被广告打断。",
  },
  {
    title: "为整木从业者准备的内容型商城入口",
    description:
      "通过行业书籍、护理产品与热门推荐三条主线，把学习、养护和采购连接起来，形成门户站内更自然的转化闭环。",
  },
];
