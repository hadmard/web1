export type BackgroundImageKey =
  | "homeHero"
  | "homeUpdates"
  | "homeStructureMarket"
  | "homeStructureDictionary"
  | "homeStructureStandards"
  | "homeStructureAwards"
  | "homeEnterprise"
  | "homeHuadian"
  | "newsHero"
  | "brandsHero"
  | "dictionaryHero"
  | "standardsHero"
  | "awardsHero";

export type HomeAdKey = "homeTop" | "homeMiddle";

export type SiteAdSlot = {
  enabled: boolean;
  title: string;
  imageUrl: string;
  href: string;
};

export type SiteVisualSettings = {
  backgrounds: Record<BackgroundImageKey, string>;
  ads: Record<HomeAdKey, SiteAdSlot>;
};

export const BACKGROUND_IMAGE_FIELDS: Array<{
  key: BackgroundImageKey;
  label: string;
  requiredSize: string;
}> = [
  { key: "homeHero", label: "首页主视觉背景", requiredSize: "1920x900 px" },
  { key: "homeUpdates", label: "首页资讯横幅", requiredSize: "1600x900 px" },
  { key: "homeStructureMarket", label: "首页结构卡片-整木市场", requiredSize: "1200x700 px" },
  { key: "homeStructureDictionary", label: "首页结构卡片-整木词库", requiredSize: "1200x700 px" },
  { key: "homeStructureStandards", label: "首页结构卡片-整木标准", requiredSize: "1200x700 px" },
  { key: "homeStructureAwards", label: "首页结构卡片-整木评选", requiredSize: "1200x700 px" },
  { key: "homeEnterprise", label: "首页企业生态图", requiredSize: "1600x900 px" },
  { key: "homeHuadian", label: "首页华点榜横幅", requiredSize: "1600x900 px" },
  { key: "newsHero", label: "资讯栏目页背景", requiredSize: "1920x640 px" },
  { key: "brandsHero", label: "市场栏目页背景", requiredSize: "1920x640 px" },
  { key: "dictionaryHero", label: "词库栏目页背景", requiredSize: "1920x640 px" },
  { key: "standardsHero", label: "标准栏目页背景", requiredSize: "1920x640 px" },
  { key: "awardsHero", label: "评选栏目页背景", requiredSize: "1920x640 px" },
];

export const HOME_AD_FIELDS: Array<{
  key: HomeAdKey;
  label: string;
  requiredSize: string;
}> = [
  { key: "homeTop", label: "首页广告位（顶部）", requiredSize: "1440x360 px" },
  { key: "homeMiddle", label: "首页广告位（中部）", requiredSize: "1440x320 px" },
];

export const DEFAULT_SITE_VISUAL_SETTINGS: SiteVisualSettings = {
  backgrounds: {
    homeHero: "/images/seedance2/picture_1.jpg",
    homeUpdates: "/images/seedance2/picture_2.jpg",
    homeStructureMarket: "/images/seedance2/picture_3.jpg",
    homeStructureDictionary: "/images/seedance2/picture_4.jpg",
    homeStructureStandards: "/images/seedance2/picture_5.jpg",
    homeStructureAwards: "/images/seedance2/picture_6.jpg",
    homeEnterprise: "/images/seedance2/picture_7.jpg",
    homeHuadian: "/images/seedance2/picture_8.jpg",
    newsHero: "/images/seedance2/picture_9.jpg",
    brandsHero: "/images/seedance2/picture_10.jpg",
    dictionaryHero: "/images/seedance2/picture_11.jpg",
    standardsHero: "/images/seedance2/picture_12.jpg",
    awardsHero: "/images/seedance2/picture_13.jpg",
  },
  ads: {
    homeTop: {
      enabled: true,
      title: "首页推荐位",
      imageUrl: "/images/seedance2/picture_18.jpg",
      href: "/membership",
    },
    homeMiddle: {
      enabled: false,
      title: "首页中部广告位",
      imageUrl: "/images/seedance2/picture_20.jpg",
      href: "/brands/all",
    },
  },
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeSiteVisualSettings(input: unknown): SiteVisualSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<SiteVisualSettings>;
  const rawBackgrounds = (raw.backgrounds && typeof raw.backgrounds === "object"
    ? raw.backgrounds
    : {}) as Partial<Record<BackgroundImageKey, string>>;
  const rawAds = (raw.ads && typeof raw.ads === "object"
    ? raw.ads
    : {}) as Partial<Record<HomeAdKey, Partial<SiteAdSlot>>>;

  const backgrounds = BACKGROUND_IMAGE_FIELDS.reduce((acc, field) => {
    const incoming = toText(rawBackgrounds[field.key]);
    acc[field.key] = incoming || DEFAULT_SITE_VISUAL_SETTINGS.backgrounds[field.key];
    return acc;
  }, {} as Record<BackgroundImageKey, string>);

  const ads = HOME_AD_FIELDS.reduce((acc, field) => {
    const incoming = rawAds[field.key] ?? {};
    const fallback = DEFAULT_SITE_VISUAL_SETTINGS.ads[field.key];
    acc[field.key] = {
      enabled: toBool(incoming.enabled, fallback.enabled),
      title: toText(incoming.title) || fallback.title,
      imageUrl: toText(incoming.imageUrl) || fallback.imageUrl,
      href: toText(incoming.href) || fallback.href,
    };
    return acc;
  }, {} as Record<HomeAdKey, SiteAdSlot>);

  return { backgrounds, ads };
}
