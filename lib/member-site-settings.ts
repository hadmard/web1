import { prisma } from "@/lib/prisma";

export type MemberSiteSettings = {
  template: "brand_showcase" | "professional_service" | "simple_elegant";
  heroTitle: string;
  heroSubtitle: string;
  contactLabel: string;
  homepageTagline: string;
  homepageTags: string[];
  heroImageUrl: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  secondaryCtaType: "anchor" | "external";
  secondaryCtaTarget: string;
  capabilityCards: Array<{
    title: string;
    description: string;
    iconKey: string;
  }>;
  contact: {
    contactPerson: string;
    contactPhone: string;
    wechatId: string;
    wechatQrImageUrl: string;
    websiteUrl: string;
    city: string;
    address: string;
    contactFormUrl: string;
    contactIntro: string;
  };
  modules: {
    intro: boolean;
    advantages: boolean;
    tags: boolean;
    news: boolean;
    gallery: boolean;
    contact: boolean;
    standards: boolean;
    terms: boolean;
    video: boolean;
  };
  seo: {
    title: string;
    keywords: string;
    description: string;
    imageUrl: string;
  };
  sync: {
    websiteUrl: string;
    apiEndpoint: string;
    rssUrl: string;
    syncEnabled: boolean;
  };
};

const DEFAULT_MEMBER_SITE_SETTINGS: MemberSiteSettings = {
  template: "brand_showcase",
  heroTitle: "",
  heroSubtitle: "",
  contactLabel: "联系我们",
  homepageTagline: "",
  homepageTags: [],
  heroImageUrl: "",
  primaryCtaLabel: "立即咨询",
  secondaryCtaLabel: "查看案例",
  secondaryCtaType: "anchor",
  secondaryCtaTarget: "#gallery-section",
  capabilityCards: [],
  contact: {
    contactPerson: "",
    contactPhone: "",
    wechatId: "",
    wechatQrImageUrl: "",
    websiteUrl: "",
    city: "",
    address: "",
    contactFormUrl: "",
    contactIntro: "",
  },
  modules: {
    intro: true,
    advantages: true,
    tags: true,
    news: true,
    gallery: true,
    contact: true,
    standards: true,
    terms: true,
    video: true,
  },
  seo: {
    title: "",
    keywords: "",
    description: "",
    imageUrl: "",
  },
  sync: {
    websiteUrl: "",
    apiEndpoint: "",
    rssUrl: "",
    syncEnabled: false,
  },
};

function buildKey(memberId: string) {
  return `member_site_settings:${memberId}`;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown, maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  ).slice(0, maxItems);
}

function asCtaType(value: unknown): "anchor" | "external" {
  return value === "external" ? "external" : "anchor";
}

function normalizeTarget(value: unknown, type: "anchor" | "external") {
  const normalized = asString(value, type === "anchor" ? "#gallery-section" : "");
  if (type === "external") return normalized;
  return normalized.startsWith("#") ? normalized : "#gallery-section";
}

function asCapabilityCards(value: unknown) {
  if (!Array.isArray(value)) return [] as MemberSiteSettings["capabilityCards"];
  return value
    .map((item) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: asString(source.title),
        description: asString(source.description),
        iconKey: asString(source.iconKey),
      };
    })
    .filter((item) => item.title || item.description)
    .slice(0, 6);
}

export function normalizeMemberSiteSettings(value: unknown): MemberSiteSettings {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const modules =
    source.modules && typeof source.modules === "object"
      ? (source.modules as Record<string, unknown>)
      : {};
  const seo = source.seo && typeof source.seo === "object" ? (source.seo as Record<string, unknown>) : {};
  const sync = source.sync && typeof source.sync === "object" ? (source.sync as Record<string, unknown>) : {};
  const contact = source.contact && typeof source.contact === "object" ? (source.contact as Record<string, unknown>) : {};
  const secondaryCtaType = asCtaType(source.secondaryCtaType);

  return {
    template:
      source.template === "professional_service" || source.template === "simple_elegant"
        ? source.template
        : DEFAULT_MEMBER_SITE_SETTINGS.template,
    heroTitle: asString(source.heroTitle),
    heroSubtitle: asString(source.heroSubtitle),
    contactLabel: asString(source.contactLabel, DEFAULT_MEMBER_SITE_SETTINGS.contactLabel),
    homepageTagline: asString(source.homepageTagline),
    homepageTags: asStringArray(source.homepageTags),
    heroImageUrl: asString(source.heroImageUrl),
    primaryCtaLabel: asString(source.primaryCtaLabel, DEFAULT_MEMBER_SITE_SETTINGS.primaryCtaLabel),
    secondaryCtaLabel: asString(source.secondaryCtaLabel, DEFAULT_MEMBER_SITE_SETTINGS.secondaryCtaLabel),
    secondaryCtaType,
    secondaryCtaTarget: normalizeTarget(source.secondaryCtaTarget, secondaryCtaType),
    capabilityCards: asCapabilityCards(source.capabilityCards),
    contact: {
      contactPerson: asString(contact.contactPerson),
      contactPhone: asString(contact.contactPhone),
      wechatId: asString(contact.wechatId),
      wechatQrImageUrl: asString(contact.wechatQrImageUrl),
      websiteUrl: asString(contact.websiteUrl),
      city: asString(contact.city),
      address: asString(contact.address),
      contactFormUrl: asString(contact.contactFormUrl),
      contactIntro: asString(contact.contactIntro),
    },
    modules: {
      intro: asBool(modules.intro, DEFAULT_MEMBER_SITE_SETTINGS.modules.intro),
      advantages: asBool(modules.advantages, DEFAULT_MEMBER_SITE_SETTINGS.modules.advantages),
      tags: asBool(modules.tags, DEFAULT_MEMBER_SITE_SETTINGS.modules.tags),
      news: asBool(modules.news, asBool(modules.brands, DEFAULT_MEMBER_SITE_SETTINGS.modules.news)),
      gallery: asBool(modules.gallery, DEFAULT_MEMBER_SITE_SETTINGS.modules.gallery),
      contact: asBool(modules.contact, DEFAULT_MEMBER_SITE_SETTINGS.modules.contact),
      standards: asBool(modules.standards, DEFAULT_MEMBER_SITE_SETTINGS.modules.standards),
      terms: asBool(modules.terms, DEFAULT_MEMBER_SITE_SETTINGS.modules.terms),
      video: asBool(modules.video, DEFAULT_MEMBER_SITE_SETTINGS.modules.video),
    },
    seo: {
      title: asString(seo.title),
      keywords: asString(seo.keywords),
      description: asString(seo.description),
      imageUrl: asString(seo.imageUrl),
    },
    sync: {
      websiteUrl: asString(sync.websiteUrl),
      apiEndpoint: asString(sync.apiEndpoint),
      rssUrl: asString(sync.rssUrl),
      syncEnabled: asBool(sync.syncEnabled, DEFAULT_MEMBER_SITE_SETTINGS.sync.syncEnabled),
    },
  };
}

export async function getMemberSiteSettings(memberId: string): Promise<MemberSiteSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: buildKey(memberId) },
    select: { value: true },
  });

  if (!row?.value) return normalizeMemberSiteSettings({});

  try {
    return normalizeMemberSiteSettings(JSON.parse(row.value));
  } catch {
    return normalizeMemberSiteSettings({});
  }
}

export async function saveMemberSiteSettings(memberId: string, settings: MemberSiteSettings) {
  const normalized = normalizeMemberSiteSettings(settings);
  return prisma.appSetting.upsert({
    where: { key: buildKey(memberId) },
    update: { value: JSON.stringify(normalized) },
    create: { key: buildKey(memberId), value: JSON.stringify(normalized) },
  });
}

export function getDefaultMemberSiteSettings() {
  return normalizeMemberSiteSettings({});
}
