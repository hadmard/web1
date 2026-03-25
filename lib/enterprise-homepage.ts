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
  enterprise: Pick<EnterpriseBase, "productSystem" | "craftLevel" | "region" | "positioning">,
) {
  if (configuredTags.length > 0) return configuredTags.slice(0, 6);

  return Array.from(
    new Set(
      [
        enterprise.productSystem,
        enterprise.craftLevel,
        enterprise.region ? `${enterprise.region}服务` : null,
        enterprise.positioning ? toSummaryText(enterprise.positioning, 16) : null,
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
  const cards = [
    enterprise.productSystem
      ? {
          title: "主营产品 / 服务",
          description: enterprise.productSystem,
          iconKey: "product",
        }
      : null,
    enterprise.craftLevel
      ? {
          title: "工艺能力",
          description: `围绕${enterprise.craftLevel}建立更稳定的落地与交付能力。`,
          iconKey: "craft",
        }
      : null,
    enterprise.positioning
      ? {
          title: "应用场景",
          description: toSummaryText(enterprise.positioning, 40) || enterprise.positioning,
          iconKey: "scene",
        }
      : null,
    enterprise.region || enterprise.area
      ? {
          title: "服务范围",
          description: [enterprise.region, enterprise.area].filter(Boolean).join(" / "),
          iconKey: "region",
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; iconKey: string }>;

  return [
    ...cards,
    {
      title: "方案交付",
      description: "支持从前期沟通、需求梳理到后续落地的完整协同。",
      iconKey: "delivery",
    },
    {
      title: "品牌表达",
      description: "兼顾品牌展示、项目说服力与合作转化效率。",
      iconKey: "brand",
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
    "欢迎通过电话、官网或平台需求入口与企业建立联系，我们会协助你更快完成对接。";

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
