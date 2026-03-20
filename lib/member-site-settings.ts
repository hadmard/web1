import { prisma } from "@/lib/prisma";

export type MemberSiteSettings = {
  template: "brand_showcase" | "professional_service" | "simple_elegant";
  heroTitle: string;
  heroSubtitle: string;
  contactLabel: string;
  modules: {
    intro: boolean;
    advantages: boolean;
    tags: boolean;
    contact: boolean;
    standards: boolean;
    terms: boolean;
    brands: boolean;
    video: boolean;
  };
  seo: {
    title: string;
    keywords: string;
    description: string;
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
  modules: {
    intro: true,
    advantages: true,
    tags: true,
    contact: true,
    standards: true,
    terms: true,
    brands: true,
    video: true,
  },
  seo: {
    title: "",
    keywords: "",
    description: "",
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

export function normalizeMemberSiteSettings(value: unknown): MemberSiteSettings {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const modules =
    source.modules && typeof source.modules === "object"
      ? (source.modules as Record<string, unknown>)
      : {};
  const seo = source.seo && typeof source.seo === "object" ? (source.seo as Record<string, unknown>) : {};
  const sync = source.sync && typeof source.sync === "object" ? (source.sync as Record<string, unknown>) : {};

  return {
    template:
      source.template === "professional_service" || source.template === "simple_elegant"
        ? source.template
        : DEFAULT_MEMBER_SITE_SETTINGS.template,
    heroTitle: asString(source.heroTitle),
    heroSubtitle: asString(source.heroSubtitle),
    contactLabel: asString(source.contactLabel, DEFAULT_MEMBER_SITE_SETTINGS.contactLabel),
    modules: {
      intro: asBool(modules.intro, DEFAULT_MEMBER_SITE_SETTINGS.modules.intro),
      advantages: asBool(modules.advantages, DEFAULT_MEMBER_SITE_SETTINGS.modules.advantages),
      tags: asBool(modules.tags, DEFAULT_MEMBER_SITE_SETTINGS.modules.tags),
      contact: asBool(modules.contact, DEFAULT_MEMBER_SITE_SETTINGS.modules.contact),
      standards: asBool(modules.standards, DEFAULT_MEMBER_SITE_SETTINGS.modules.standards),
      terms: asBool(modules.terms, DEFAULT_MEMBER_SITE_SETTINGS.modules.terms),
      brands: asBool(modules.brands, DEFAULT_MEMBER_SITE_SETTINGS.modules.brands),
      video: asBool(modules.video, DEFAULT_MEMBER_SITE_SETTINGS.modules.video),
    },
    seo: {
      title: asString(seo.title),
      keywords: asString(seo.keywords),
      description: asString(seo.description),
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

  if (!row?.value) return { ...DEFAULT_MEMBER_SITE_SETTINGS };

  try {
    return normalizeMemberSiteSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_MEMBER_SITE_SETTINGS };
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
  return { ...DEFAULT_MEMBER_SITE_SETTINGS };
}
