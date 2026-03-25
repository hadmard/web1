import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import type { MemberSiteSettings } from "@/lib/member-site-settings";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type EnterpriseBase = {
  companyName?: string | null;
  companyShortName?: string | null;
  intro?: string | null;
  positioning?: string | null;
  productSystem?: string | null;
  craftLevel?: string | null;
  region?: string | null;
  area?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  contactInfo?: string | null;
  address?: string | null;
};

type GalleryLike = {
  imageUrl?: string | null;
};

function pickFirst(...values: Array<string | null | undefined>) {
  return values.map((value) => (value || "").trim()).find(Boolean) || "";
}

function compactTag(value: string | null | undefined, maxLength = 12) {
  const text = htmlToPlainText(value);
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || /^[-|/\\·,.，。]+$/.test(normalized)) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…` : normalized;
}

function compactSentence(value: string | null | undefined, maxLength = 32) {
  const text = htmlToPlainText(value);
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || /^[-|/\\·,.，。]+$/.test(normalized)) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…` : normalized;
}

function compactLocation(region?: string | null, area?: string | null) {
  const normalizedRegion = compactTag(region, 10);
  const normalizedArea = compactTag(area, 10);
  if (normalizedRegion && normalizedArea) {
    if (normalizedArea.includes(normalizedRegion)) return normalizedArea;
    if (normalizedRegion.includes(normalizedArea)) return normalizedRegion;
    return `${normalizedRegion} · ${normalizedArea}`;
  }
  return normalizedRegion || normalizedArea || null;
}

function buildContactHref(value: string | null | undefined) {
  const input = (value || "").trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  const phone = input.replace(/[^\d+]/g, "");
  if (phone) return `tel:${phone}`;
  return null;
}

export function normalizeHomepageTags(
  configuredTags: string[],
  enterprise: Pick<EnterpriseBase, "productSystem" | "craftLevel" | "region" | "area" | "positioning">,
) {
  if (configuredTags.length > 0) return configuredTags.slice(0, 6);

  return Array.from(
    new Set(
      [
        compactLocation(enterprise.region, enterprise.area),
        compactTag(enterprise.craftLevel, 10),
        compactTag(enterprise.productSystem, 10),
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 3);
}

export function resolveEnterpriseHomepageHero(
  enterprise: EnterpriseBase,
  siteSettings: MemberSiteSettings,
  gallery: GalleryLike[],
) {
  const name = enterprise.companyShortName || enterprise.companyName || "企业";
  const fallbackTagline =
    toSummaryText(siteSettings.heroSubtitle || enterprise.positioning || enterprise.intro, 36) ||
    `${name}专注整木与空间服务，持续输出更稳定的品牌表达与合作体验。`;

  const heroImageUrl =
    siteSettings.heroImageUrl
      ? resolveUploadedImageUrl(siteSettings.heroImageUrl)
      : gallery[0]?.imageUrl
        ? resolveUploadedImageUrl(gallery[0].imageUrl)
        : null;

  const secondaryHref =
    siteSettings.secondaryCtaType === "external"
      ? siteSettings.secondaryCtaTarget || "#gallery-section"
      : siteSettings.secondaryCtaTarget || "#gallery-section";

  return {
    title: siteSettings.heroTitle || name,
    tagline: siteSettings.homepageTagline || fallbackTagline,
    tags: normalizeHomepageTags(siteSettings.homepageTags, enterprise),
    heroImageUrl,
    primaryCtaLabel: siteSettings.primaryCtaLabel || siteSettings.contactLabel || "立即咨询",
    secondaryCtaLabel: siteSettings.secondaryCtaLabel || "查看案例",
    secondaryHref,
    introSummary:
      toSummaryText(enterprise.positioning || enterprise.intro, 120) ||
      `${name}围绕整木与空间服务建立统一展示与交付表达。`,
    introPlain: htmlToPlainText(enterprise.intro || enterprise.positioning || ""),
  };
}

function buildCapabilityFallbacks(enterprise: EnterpriseBase) {
  return [
    {
      title: "整木系统定制",
      description: compactSentence(enterprise.productSystem, 22) || "覆盖柜体、墙板与门系统的整体方案。",
      iconKey: "product",
    },
    {
      title: "高端空间适配",
      description:
        compactSentence(enterprise.positioning, 22) ||
        "适用于住宅、会所、商业空间等多类整木项目场景。",
      iconKey: "scene",
    },
    {
      title: "精细工艺呈现",
      description: enterprise.craftLevel
        ? `围绕${toSummaryText(enterprise.craftLevel, 12)}强化细节呈现。`
        : "注重材质统一与细节表达。",
      iconKey: "craft",
    },
    {
      title: "一体化落地服务",
      description: "从方案到施工交付，全流程支持。",
      iconKey: "delivery",
    },
  ].slice(0, 4);
}

export function resolveEnterpriseHomepageCapabilities(
  enterprise: EnterpriseBase,
  siteSettings: MemberSiteSettings,
) {
  const configured = siteSettings.capabilityCards
    .filter((item) => item.title || item.description)
    .map((item) => ({
      title: item.title || "核心能力",
      description: item.description || "围绕企业现有业务持续完善能力表达。",
      iconKey: item.iconKey || "capability",
      source: "configured" as const,
    }));

  if (configured.length >= 3) return configured.slice(0, 6);

  const fallbacks = buildCapabilityFallbacks(enterprise)
    .filter((item) => !configured.some((configuredItem) => configuredItem.title === item.title))
    .map((item) => ({ ...item, source: "fallback" as const }));

  return [...configured, ...fallbacks].slice(0, 6);
}

export function resolveEnterpriseHomepageContact(
  enterprise: EnterpriseBase,
  siteSettings: MemberSiteSettings,
) {
  const contactPerson = pickFirst(siteSettings.contact.contactPerson, enterprise.contactPerson);
  const contactPhone = pickFirst(siteSettings.contact.contactPhone, enterprise.contactPhone);
  const websiteUrl = pickFirst(siteSettings.contact.websiteUrl, enterprise.website);
  const city = pickFirst(siteSettings.contact.city, enterprise.area, enterprise.region);
  const address = pickFirst(siteSettings.contact.address, enterprise.address);
  const wechatId = pickFirst(siteSettings.contact.wechatId);
  const wechatQrImageUrl = pickFirst(siteSettings.contact.wechatQrImageUrl);
  const contactFormUrl = pickFirst(siteSettings.contact.contactFormUrl);
  const contactIntro =
    pickFirst(siteSettings.contact.contactIntro) ||
    "提交您的需求，我们将为您提供专属整木空间解决方案，从设计到落地，全流程支持。";

  const items = [
    contactPerson ? { label: "联系人", value: contactPerson } : null,
    contactPhone ? { label: "联系电话", value: contactPhone, href: buildContactHref(contactPhone) } : null,
    wechatId ? { label: "微信号", value: wechatId } : null,
    websiteUrl ? { label: "官网地址", value: websiteUrl, href: buildContactHref(websiteUrl) } : null,
    city ? { label: "所在城市", value: city } : null,
    address ? { label: "联系地址", value: address } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href?: string | null }>;

  return {
    contactPerson,
    contactPhone,
    wechatId,
    wechatQrImageUrl,
    websiteUrl,
    city,
    address,
    contactFormUrl,
    contactIntro,
    items,
    primaryCtaHref: contactFormUrl || buildContactHref(contactPhone) || buildContactHref(websiteUrl) || "#contact-panel",
    hasRealContact: Boolean(contactPhone || websiteUrl || wechatId),
  };
}

export function resolveEnterpriseHomepageSeo(
  enterprise: EnterpriseBase,
  siteSettings: MemberSiteSettings,
  gallery: GalleryLike[],
) {
  const name = enterprise.companyShortName || enterprise.companyName || "企业";
  const tags = normalizeHomepageTags(siteSettings.homepageTags, enterprise).slice(0, 3);
  const tagline =
    pickFirst(siteSettings.homepageTagline, siteSettings.heroSubtitle, enterprise.positioning) ||
    "会员企业主页";

  const title = pickFirst(siteSettings.seo.title) || (tagline ? `${name}｜${tagline}` : `${name}｜会员企业主页`);

  const description =
    pickFirst(siteSettings.seo.description) ||
    [tagline, tags.join(" / "), toSummaryText(enterprise.productSystem || enterprise.intro || enterprise.positioning, 54)]
      .filter(Boolean)
      .join("，")
      .slice(0, 120);

  const imageUrl =
    pickFirst(siteSettings.seo.imageUrl)
      ? resolveUploadedImageUrl(siteSettings.seo.imageUrl)
      : pickFirst(siteSettings.heroImageUrl)
        ? resolveUploadedImageUrl(siteSettings.heroImageUrl)
        : gallery[0]?.imageUrl
          ? resolveUploadedImageUrl(gallery[0].imageUrl)
          : null;

  return {
    title,
    description: description || `${name}的企业主页，展示品牌定位、能力表达与联系转化入口。`,
    imageUrl,
  };
}
