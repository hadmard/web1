export const HUADIAN_DEFINITION =
  "华点榜是由中华整木网发起的整木行业信用推荐榜单体系。";

export type RegionKey = "east" | "south" | "north" | "central" | "southwest" | "northwest" | "northeast";

export const REGION_LABELS: Record<RegionKey, string> = {
  east: "华东",
  south: "华南",
  north: "华北",
  central: "华中",
  southwest: "西南",
  northwest: "西北",
  northeast: "东北",
};

export type Winner = {
  name: string;
  region: string;
  focus: string;
  awardType: string;
  reason: string;
  homepage: string;
};

export type AnnualBoard = {
  year: number;
  background: string;
  dimensions: string[];
  publicNotice: string;
  supervision: string;
  winners: Winner[];
};

export type TopBrand = {
  slug: string;
  name: string;
  logo: string;
  intro: string;
  year: number;
  category: string;
  reason: string;
  caseStudy: string;
  standardsHref: string;
  enterpriseHref: string;
};

export type RegionBoardItem = {
  region: RegionKey;
  year: number;
  intro: string;
  recommended: string[];
  growth: string[];
  featured: string[];
};

export type SpecialAward = {
  slug: string;
  name: string;
  definition: string;
  criteria: string[];
  winners: string[];
  note: string;
};

export type EngineerSupplier = {
  slug: string;
  name: string;
  category: "hardware" | "veneer" | "panel" | "coating" | "system";
  serviceCategory: string;
  coreProducts: string;
  serviceRegions: string;
  partnerBrands: string;
  reason: string;
  cases: string;
  certUploadHint: string;
};

export const ENGINEER_CATEGORY_LABELS = {
  hardware: "五金供应商",
  veneer: "木皮供应商",
  panel: "板材供应商",
  coating: "涂料供应商",
  system: "系统配套供应商",
} as const;

export const annualBoards: AnnualBoard[] = [
  {
    year: 2025,
    background:
      "2025 年整木行业进入精细化竞争阶段，市场从规模增长转向信用与交付并重。华点榜以长期服务能力和可验证交付为核心进行信用推荐。",
    dimensions: ["品牌力", "产品力", "工艺能力", "服务能力", "行业影响力"],
    publicNotice:
      "入选企业须完成 15 天公开公示，接受行业用户、合作方与媒体监督反馈，公示期间新增异议将进入复核。",
    supervision:
      "设立监督机制：异议反馈、材料复验、专家复审、复核结论公示，确保榜单长期可信与可追溯。",
    winners: [
      {
        name: "华木定制",
        region: "华东",
        focus: "高端整木系统交付",
        awardType: "年度十大推荐品牌",
        reason:
          "在多城市项目中保持稳定交付节奏与工艺一致性，拥有较完整的标准化实施路径。企业在设计落地、工厂协同和现场管理上形成闭环能力，用户口碑持续稳定。",
        homepage: "/brands/all",
      },
      {
        name: "南岭木作",
        region: "华南",
        focus: "整装木作一体化",
        awardType: "区域推荐品牌",
        reason:
          "在区域市场具备成熟渠道与项目复用能力，服务响应效率较高。其材料管理和节点验收体系稳定，连续多个项目保持较低返工率，体现出长期服务可靠性。",
        homepage: "/brands/all",
      },
      {
        name: "北辰木艺",
        region: "华北",
        focus: "工程配套整木",
        awardType: "配套商推荐",
        reason:
          "在大体量工程场景中展现出供应链协同与工期控制能力，具备较强的标准执行与质量追溯机制。企业在跨区域协作中表现稳定，工程复购率较高。",
        homepage: "/brands/all",
      },
    ],
  },
  {
    year: 2024,
    background:
      "2024 年行业普遍关注降本与稳定交付，华点榜强化信用维度中的公示机制和监督机制，推动评选由活动化走向制度化。",
    dimensions: ["品牌力", "产品力", "工艺能力", "服务能力", "行业影响力"],
    publicNotice:
      "榜单采用阶段公示制度，重点公开评审口径、评分维度和入围依据，确保企业与用户可核验。",
    supervision:
      "监督机制覆盖报名信息核验、第三方资料抽样核查和异议复核，复核结果可在归档页面查询。",
    winners: [
      {
        name: "东禾木作",
        region: "华东",
        focus: "整木高定",
        awardType: "年度十大推荐品牌",
        reason:
          "在高定项目中形成了稳定的工艺与交付体系，能够兼顾设计表达与现场可实施性。企业持续公开项目案例与关键工艺节点，透明度较高，利于行业参考。",
        homepage: "/brands/all",
      },
      {
        name: "中原木匠",
        region: "华中",
        focus: "住宅木作系统",
        awardType: "区域成长品牌",
        reason:
          "区域增速与项目完成质量兼具，建立了较完善的售后跟踪与问题闭环机制。其服务链路从下单到交付节点清晰，用户满意度连续提升。",
        homepage: "/brands/all",
      },
    ],
  },
];

export const top10ByYear: Record<number, TopBrand[]> = {
  2025: [
    {
      slug: "huamu-custom",
      name: "华木定制",
      logo: "/images/category-awards.svg",
      intro: "聚焦整木一体化项目，覆盖设计、制造、安装与售后。",
      year: 2025,
      category: "年度十大推荐品牌",
      reason: "在复杂项目中保持稳定交付表现，工艺标准执行度与服务响应效率均处于行业前列。",
      caseStudy: "华东某高端住宅整木系统项目",
      standardsHref: "/standards/all",
      enterpriseHref: "/brands/all",
    },
    {
      slug: "nanling-wood",
      name: "南岭木作",
      logo: "/images/category-awards.svg",
      intro: "专注整装场景木作系统化交付。",
      year: 2025,
      category: "年度十大推荐品牌",
      reason: "材料管理与节点验收体系成熟，连续项目稳定性表现突出。",
      caseStudy: "华南区域连锁精装项目",
      standardsHref: "/standards/all",
      enterpriseHref: "/brands/all",
    },
  ],
  2024: [
    {
      slug: "donghe-wood",
      name: "东禾木作",
      logo: "/images/category-awards.svg",
      intro: "面向高定场景的整木系统服务企业。",
      year: 2024,
      category: "年度十大推荐品牌",
      reason: "公开资料完整、工程复盘规范，具备较强信用可验证性。",
      caseStudy: "华东别墅定制项目",
      standardsHref: "/standards/all",
      enterpriseHref: "/brands/all",
    },
  ],
};

export const regionBoards: RegionBoardItem[] = [
  {
    region: "east",
    year: 2025,
    intro: "华东区域整木产业链配套完善，重点看重交付稳定性与工艺复现能力。",
    recommended: ["华木定制", "东禾木作"],
    growth: ["申木家居", "海岳木作"],
    featured: ["江南木艺", "清木高定"],
  },
  {
    region: "south",
    year: 2025,
    intro: "华南区域以整装协同和快速响应为优势，重点看重服务密度与工程协同。",
    recommended: ["南岭木作", "粤匠整木"],
    growth: ["岭南木语", "鹏城木作"],
    featured: ["海湾木艺", "广作美学"],
  },
  {
    region: "north",
    year: 2025,
    intro: "华北区域项目体量较大，强调标准执行和项目治理能力。",
    recommended: ["北辰木艺", "京木系统"],
    growth: ["燕赵木作", "津门木艺"],
    featured: ["北木匠心", "华朔木作"],
  },
  {
    region: "central",
    year: 2025,
    intro: "华中区域在住宅木作和商业木作中呈现快速升级趋势。",
    recommended: ["中原木匠", "楚风木作"],
    growth: ["湘木工坊", "赣木定制"],
    featured: ["江汉木艺", "中州木作"],
  },
  {
    region: "southwest",
    year: 2025,
    intro: "西南区域强调本地化服务与复杂气候条件下的工艺适配。",
    recommended: ["蜀木定制", "云岭木艺"],
    growth: ["川木匠作", "滇木系统"],
    featured: ["巴山木作", "高原木艺"],
  },
  {
    region: "northwest",
    year: 2025,
    intro: "西北区域以工程配套与耐候工艺实践为主要亮点。",
    recommended: ["秦岭木作", "西域整木"],
    growth: ["陇木系统", "河西木艺"],
    featured: ["大漠木作", "关中木艺"],
  },
  {
    region: "northeast",
    year: 2025,
    intro: "东北区域重视材料稳定性与冬季施工保障能力。",
    recommended: ["北境木作", "辽木定制"],
    growth: ["吉木工坊", "哈城木艺"],
    featured: ["松江木作", "寒地木艺"],
  },
];

export const specialAwards: SpecialAward[] = [
  {
    slug: "craft-innovation",
    name: "工艺创新奖",
    definition: "表彰在结构、节点、制造工艺方面持续创新并可规模化落地的企业。",
    criteria: ["工艺原创性", "可复制性", "质量稳定性", "交付效率"],
    winners: ["华木定制", "蜀木定制"],
    note: "获奖企业需提交工艺流程与质量复核资料。",
  },
  {
    slug: "design-excellence",
    name: "设计表现奖",
    definition: "表彰在整木空间表达、系统一致性和用户体验上表现突出的企业。",
    criteria: ["空间完整性", "审美一致性", "落地还原度", "用户反馈"],
    winners: ["南岭木作", "东禾木作"],
    note: "评审同时参考项目现场还原记录。",
  },
  {
    slug: "service-benchmark",
    name: "服务标杆奖",
    definition: "表彰在售前到售后全链路服务中标准明确、响应高效的企业。",
    criteria: ["服务标准", "响应时效", "问题闭环率", "客户满意度"],
    winners: ["北辰木艺", "中原木匠"],
    note: "需公开服务承诺与履约样本。",
  },
  {
    slug: "digital-innovation",
    name: "数字化创新奖",
    definition: "表彰在数字化设计、制造协同、项目管理方面具有实效成果的企业。",
    criteria: ["系统应用深度", "协同效率提升", "数据可追踪性", "持续优化能力"],
    winners: ["京木系统", "粤匠整木"],
    note: "需提供年度数字化实践报告。",
  },
];

export const engineerSuppliers: EngineerSupplier[] = [
  {
    slug: "jinggong-hardware",
    name: "精工五金",
    category: "hardware",
    serviceCategory: "五金供应商",
    coreProducts: "铰链、滑轨、功能五金系统",
    serviceRegions: "华东、华南、华中",
    partnerBrands: "华木定制、南岭木作",
    reason: "在耐久性与交付稳定性方面长期表现可靠，售后响应机制完善。",
    cases: "华东高端住宅项目五金系统配套",
    certUploadHint: "上传材质检测报告、质保承诺、项目服务证明",
  },
  {
    slug: "senyi-veneer",
    name: "森艺木皮",
    category: "veneer",
    serviceCategory: "木皮供应商",
    coreProducts: "天然木皮、科技木皮、饰面方案",
    serviceRegions: "华东、华北、西南",
    partnerBrands: "东禾木作、北辰木艺",
    reason: "色差控制和批次稳定性良好，具备持续供货能力。",
    cases: "区域连锁整装木作木皮配套",
    certUploadHint: "上传环保检测、来源证明、批次稳定性说明",
  },
  {
    slug: "lianhe-panel",
    name: "联禾板材",
    category: "panel",
    serviceCategory: "板材供应商",
    coreProducts: "多层板、生态板、结构板",
    serviceRegions: "全国",
    partnerBrands: "中原木匠、蜀木定制",
    reason: "板材性能稳定，跨区域供货能力成熟。",
    cases: "多城市整木项目板材统一供给",
    certUploadHint: "上传质检报告、环保认证、供货能力说明",
  },
];

export function getLatestHuadianYear() {
  return Math.max(...annualBoards.map((x) => x.year));
}

export function getAnnualBoard(year: number) {
  return annualBoards.find((x) => x.year === year);
}

export function getTop10ByYear(year: number) {
  return top10ByYear[year] ?? [];
}

export function getTopBrand(year: number, slug: string) {
  return getTop10ByYear(year).find((x) => x.slug === slug);
}

export function getBrandAwardHistory(name: string) {
  return Object.entries(top10ByYear)
    .flatMap(([year, list]) =>
      list
        .filter((x) => x.name === name)
        .map((x) => ({ year: Number(year), category: x.category }))
    )
    .sort((a, b) => b.year - a.year);
}

export function getRegionBoard(region: string, year: number) {
  return regionBoards.find((x) => x.region === region && x.year === year);
}

export function getSpecialAward(slug: string) {
  return specialAwards.find((x) => x.slug === slug);
}

export function getEngineerCategorySuppliers(category: string) {
  return engineerSuppliers.filter((x) => x.category === category);
}

export function getEngineerSupplier(category: string, slug: string) {
  return engineerSuppliers.find((x) => x.category === category && x.slug === slug);
}
