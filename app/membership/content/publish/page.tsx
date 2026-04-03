"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CONTENT_TAB_DEFS,
  MEMBER_PUBLISH_CATEGORY_OPTIONS,
  resolveTabKeyFromHref,
  type CategoryOption,
  type ContentTabKey,
} from "@/lib/content-taxonomy";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { RichEditor } from "@/components/RichEditor";
import { suggestTagsFromText } from "@/lib/tag-suggest";
import { BrandStructuredEditor } from "@/components/BrandStructuredEditor";
import {
  brandStructuredToSearchText,
  buildBrandStructuredHtml,
  createDefaultBrandStructuredData,
  parseBrandStructuredHtml,
  type BrandStructuredData,
} from "@/lib/brand-structured";
import { StandardStructuredEditor } from "@/components/StandardStructuredEditor";
import {
  buildStandardStructuredHtml,
  createDefaultStandardStructuredData,
  parseStandardStructuredHtml,
  standardStructuredToSearchText,
  type StandardStructuredData,
} from "@/lib/standard-structured";
import { DataStructuredEditor } from "@/components/DataStructuredEditor";
import {
  buildDataStructuredHtml,
  createDefaultDataStructuredData,
  dataStructuredToSearchText,
  parseDataStructuredHtml,
  type DataStructuredData,
} from "@/lib/data-structured";
import { AwardStructuredEditor } from "@/components/AwardStructuredEditor";
import {
  awardStructuredToSearchText,
  buildAwardStructuredHtml,
  createDefaultAwardStructuredData,
  parseAwardStructuredHtml,
  type AwardStructuredData,
} from "@/lib/award-structured";
import { uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { buildGeoExcerpt, previewText } from "@/lib/text";
import { suggestTagsForGeo } from "@/lib/tag-suggest";
import { buildNewsPath } from "@/lib/share-config";
import {
  createEmptyDocumentMetadata,
  parseDocumentMetadata,
  stringifyDocumentMetadata,
  type DocumentMetadata,
} from "@/lib/document-metadata";
import {
  buildAutoSeoDescription,
  buildAutoSeoKeywords,
  buildAutoSeoTitle,
  hasAutoSeoSource,
} from "@/lib/document-seo";
import { slugify } from "@/lib/slug";
import {
  formatTermContentForEditing,
  normalizeTermContent,
} from "@/lib/term-structured";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import { PUBLIC_CONTACT_PHONE } from "@/lib/public-site-config";

type MemberType = "enterprise_basic" | "enterprise_advanced" | "personal";
type Status = "draft" | "pending" | "approved" | "rejected";
type MembershipRule = {
  label: string;
  siteLabel: string;
  publishCategoryHrefs: string[];
  newsPublishLimit: number | null;
};
type AccessSubcategory = {
  href: string;
  label: string;
  enabled: boolean;
  annualLimit: number | null;
  usedCount: number;
  remainingCount: number | null;
};
type AccessCategory = {
  href: string;
  label: string;
  enabled: boolean;
  annualLimit: number | null;
  usedCount: number;
  remainingCount: number | null;
  subcategories: AccessSubcategory[];
};
type MemberAccess = {
  year: number;
  categories: AccessCategory[];
};
const BRAND_REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;
type SubmitPreview = { title: string; href: string | null; status: Status };
type VerifyStatus = "pending" | "approved" | "rejected";
type VerificationSummary = {
  status: VerifyStatus;
  reviewNote?: string | null;
  approvedEnterpriseId?: string | null;
} | null;
type EnterpriseSummary = {
  id: string;
  companyName?: string | null;
  companyShortName?: string | null;
  verificationStatus?: string | null;
} | null;

type Row = {
  id: string;
  title: string;
  slug: string;
  source?: string | null;
  sourceUrl?: string | null;
  displayAuthor?: string | null;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  categoryHref: string | null;
  subHref: string | null;
  status: Status;
  conceptSummary?: string | null;
  applicableScenarios?: string | null;
  versionLabel?: string | null;
  relatedTermSlugs?: string | null;
  relatedStandardIds?: string | null;
  relatedBrandIds?: string | null;
  tagSlugs?: string | null;
  isPinned?: boolean;
  faqJson?: string | null;
  createdAt: string;
};

const COVER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function getDefaultMemberAccess(): MemberAccess {
  return {
    year: new Date().getFullYear(),
    categories: MEMBER_PUBLISH_CATEGORY_OPTIONS.map((category) => ({
      href: category.href,
      label: category.label,
      enabled: true,
      annualLimit: null,
      usedCount: 0,
      remainingCount: null,
      subcategories: category.subs.map((sub) => ({
        href: sub.href,
        label: sub.label,
        enabled: true,
        annualLimit: null,
        usedCount: 0,
        remainingCount: null,
      })),
    })),
  };
}

function formatQuota(limit: number | null, remainingCount: number | null) {
  if (limit == null) return "不限";
  const remain = remainingCount == null ? limit : remainingCount;
  return `剩余 ${remain}/${limit}`;
}

function tabFromHref(href: string): ContentTabKey {
  const hit = CONTENT_TAB_DEFS.find((x) => x.href === href);
  return hit?.key ?? "articles";
}

function parseTab(raw: string | null): ContentTabKey {
  if (!raw) return "articles";
  const hit = CONTENT_TAB_DEFS.find((x) => x.key === raw);
  return hit?.key ?? "articles";
}

function buildPreviewHref(
  categoryHref: string | null,
  subHref: string | null,
  itemId: string | null,
  slug: string | null,
  fallbackTitle: string | null
) {
  const segment = (slug || fallbackTitle || "").trim();
  if (!segment && !itemId) return null;
  const encoded = encodeURIComponent(segment);
  const tab = resolveTabKeyFromHref(categoryHref, subHref);
  if (tab === "brands") return `/brands/${encoded}`;
  if (tab === "terms") return `/dictionary/${encoded}`;
  if (tab === "standards") return `/standards/${encoded}`;
  if (tab === "awards") return `/awards/${encoded}`;
  return itemId ? buildNewsPath(itemId) : `/news/${encoded}`;
}

function buildAutoExcerpt(text: string) {
  return previewText(text, 120);
}

function PublishCenterPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const editQueryId = searchParams.get("edit")?.trim() ?? "";

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [memberType, setMemberType] = useState<MemberType>("personal");
  const [membershipRule, setMembershipRule] = useState<MembershipRule | null>(null);
  const [memberAccess, setMemberAccess] = useState<MemberAccess>(getDefaultMemberAccess());
  const [items, setItems] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<HTMLElement | null>(null);
  const publishCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const editCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const publishObjectUrlRef = useRef<string | null>(null);
  const editObjectUrlRef = useRef<string | null>(null);
  const suppressMessageScrollRef = useRef(false);
  const autoOpenedEditIdRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<SubmitPreview | null>(null);
  const [pendingPreviewScroll, setPendingPreviewScroll] = useState<"publish" | "edit" | null>(null);
  const [cropTarget, setCropTarget] = useState<"publish" | "edit" | null>(null);
  const [latestVerification, setLatestVerification] = useState<VerificationSummary>(null);
  const [enterprise, setEnterprise] = useState<EnterpriseSummary>(null);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [displayAuthor, setDisplayAuthor] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [brandStructured, setBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [standardStructured, setStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [dataStructured, setDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [awardStructured, setAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [subHref, setSubHref] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverPreviewSrc, setCoverPreviewSrc] = useState("");
  const [conceptSummary, setConceptSummary] = useState("");
  const [applicableScenarios, setApplicableScenarios] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [relatedTermSlugs, setRelatedTermSlugs] = useState("");
  const [relatedStandardIds, setRelatedStandardIds] = useState("");
  const [relatedBrandIds, setRelatedBrandIds] = useState("");
  const [tagSlugs, setTagSlugs] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [slug, setSlug] = useState("");
  const [documentMeta, setDocumentMeta] = useState<DocumentMetadata>(createEmptyDocumentMetadata());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editBrandStructured, setEditBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [editStandardStructured, setEditStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [editDataStructured, setEditDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [editAwardStructured, setEditAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editCoverPreviewSrc, setEditCoverPreviewSrc] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editDocumentMeta, setEditDocumentMeta] = useState<DocumentMetadata>(createEmptyDocumentMetadata());
  const autoSlugRef = useRef("");
  const autoSeoRef = useRef({ seoTitle: "", seoKeywords: "", seoDescription: "" });
  const autoEditSlugRef = useRef("");
  const autoEditSeoRef = useRef({ seoTitle: "", seoKeywords: "", seoDescription: "" });

  const allCategoryAccess = useMemo(
    () => (memberAccess.categories.length > 0 ? memberAccess.categories : getDefaultMemberAccess().categories),
    [memberAccess]
  );
  const enabledCategoryAccess = useMemo(
    () => allCategoryAccess.filter((category) => category.enabled),
    [allCategoryAccess]
  );
  const allowedTabs = useMemo(() => enabledCategoryAccess.map((x) => tabFromHref(x.href)), [enabledCategoryAccess]);
  const safeTab = useMemo(() => (allowedTabs.includes(tab) ? tab : allowedTabs[0] ?? "articles"), [tab, allowedTabs]);
  const selectedTabDef = useMemo(() => CONTENT_TAB_DEFS.find((x) => x.key === safeTab) ?? CONTENT_TAB_DEFS[0], [safeTab]);
  const selectedCategoryAccess = useMemo(
    () => enabledCategoryAccess.find((x) => x.href === selectedTabDef.href) ?? enabledCategoryAccess[0] ?? null,
    [enabledCategoryAccess, selectedTabDef.href]
  );
  const selectedCategory = useMemo(
    () => MEMBER_PUBLISH_CATEGORY_OPTIONS.find((x) => x.href === selectedCategoryAccess?.href) ?? null,
    [selectedCategoryAccess]
  );
  const subOptions = useMemo(() => selectedCategoryAccess?.subcategories ?? [], [selectedCategoryAccess]);
  const activeSubAccess = useMemo(
    () => subOptions.find((item) => item.href === subHref) ?? null,
    [subOptions, subHref]
  );
  const enabledSubcategoryCount = useMemo(() => subOptions.filter((item) => item.enabled).length, [subOptions]);
  const selectedCategoryQuotaLabel = useMemo(
    () => (selectedCategoryAccess ? formatQuota(selectedCategoryAccess.annualLimit, selectedCategoryAccess.remainingCount) : "未开通"),
    [selectedCategoryAccess]
  );
  const selectedSubcategoryQuotaLabel = useMemo(
    () => (activeSubAccess ? formatQuota(activeSubAccess.annualLimit, activeSubAccess.remainingCount) : "未选择"),
    [activeSubAccess]
  );
  const canPasteImages = authed === true;
  const isDocumentTab = safeTab === "terms" || safeTab === "standards";
  const documentKind = safeTab === "standards" ? "standards" : "terms";

  const filteredItems = useMemo(
    () => items.filter((item) => resolveTabKeyFromHref(item.categoryHref, item.subHref) === safeTab),
    [items, safeTab]
  );
  const filteredStatusSummary = useMemo(
    () =>
      filteredItems.reduce(
        (acc, item) => {
          acc[item.status] += 1;
          return acc;
        },
        { draft: 0, pending: 0, approved: 0, rejected: 0 } as Record<Status, number>
      ),
    [filteredItems]
  );

  const replaceTab = useCallback((nextTab: ContentTabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", nextTab);
    router.replace(`${pathname}?${sp.toString()}`);
  }, [pathname, router, searchParams]);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    if (!meRes.ok) {
      setAuthed(false);
      return;
    }
    setAuthed(true);

    const me = await meRes.json();
    setRole(me.role ?? null);
    const t = (me.memberType ?? "personal") as MemberType;
    setMemberType(t);
    setMembershipRule(me.membershipRule ?? null);
    setMemberAccess(me.memberAccess ?? getDefaultMemberAccess());

    const [listRes, verificationRes] = await Promise.all([
      fetch("/api/member/articles?limit=100", { credentials: "include", cache: "no-store" }),
      fetch("/api/member/enterprise-verification", { credentials: "include", cache: "no-store" }),
    ]);

    if (listRes.ok) {
      const data = await listRes.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    }

    if (verificationRes.ok) {
      const data = await verificationRes.json();
      setLatestVerification((data.latest ?? null) as VerificationSummary);
      setEnterprise((data.enterprise ?? null) as EnterpriseSummary);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (allowedTabs.length === 0) return;
    if (!allowedTabs.includes(tab)) replaceTab(allowedTabs[0]);
  }, [allowedTabs, tab, replaceTab]);

  useEffect(() => {
    const enabledSubOptions = subOptions.filter((item) => item.enabled);
    if (enabledSubOptions.length > 0 && !enabledSubOptions.some((s) => s.href === subHref)) {
      if (safeTab === "articles" && enterprise?.id) {
        const enterpriseOption = enabledSubOptions.find((item) => item.href === "/news/enterprise");
        setSubHref(enterpriseOption?.href ?? enabledSubOptions[0].href);
        return;
      }
      setSubHref(enabledSubOptions[0].href);
    }
  }, [enterprise?.id, safeTab, subOptions, subHref]);

  useEffect(() => {
    if (!isDocumentTab) return;

    const nextSlug = slugify(title);
    if (!slug.trim() || slug === autoSlugRef.current) {
      setSlug(nextSlug);
    }
    autoSlugRef.current = nextSlug;

    const canAutoFillSeo = hasAutoSeoSource(documentMeta.intro, content);
    if (!canAutoFillSeo) {
      autoSeoRef.current = { seoTitle: "", seoKeywords: "", seoDescription: "" };
      return;
    }

    const nextSeoTitle = buildAutoSeoTitle(title);
    const nextSeoKeywords = buildAutoSeoKeywords(title, documentKind);
    const nextSeoDescription = buildAutoSeoDescription(title, documentMeta.intro, content);

    setDocumentMeta((prev) => ({
      ...prev,
      seoTitle: !prev.seoTitle.trim() || prev.seoTitle === autoSeoRef.current.seoTitle ? nextSeoTitle : prev.seoTitle,
      seoKeywords:
        !prev.seoKeywords.trim() || prev.seoKeywords === autoSeoRef.current.seoKeywords ? nextSeoKeywords : prev.seoKeywords,
      seoDescription:
        !prev.seoDescription.trim() || prev.seoDescription === autoSeoRef.current.seoDescription
          ? nextSeoDescription
          : prev.seoDescription,
    }));

    autoSeoRef.current = {
      seoTitle: nextSeoTitle,
      seoKeywords: nextSeoKeywords,
      seoDescription: nextSeoDescription,
    };
  }, [content, documentKind, documentMeta.intro, isDocumentTab, slug, title]);

  useEffect(() => {
    if (!isDocumentTab || !editingId) return;

    const nextSlug = slugify(editTitle);
    if (!editSlug.trim() || editSlug === autoEditSlugRef.current) {
      setEditSlug(nextSlug);
    }
    autoEditSlugRef.current = nextSlug;

    const canAutoFillSeo = hasAutoSeoSource(editDocumentMeta.intro, editContent);
    if (!canAutoFillSeo) {
      autoEditSeoRef.current = { seoTitle: "", seoKeywords: "", seoDescription: "" };
      return;
    }

    const nextSeoTitle = buildAutoSeoTitle(editTitle);
    const nextSeoKeywords = buildAutoSeoKeywords(editTitle, documentKind);
    const nextSeoDescription = buildAutoSeoDescription(editTitle, editDocumentMeta.intro, editContent);

    setEditDocumentMeta((prev) => ({
      ...prev,
      seoTitle:
        !prev.seoTitle.trim() || prev.seoTitle === autoEditSeoRef.current.seoTitle ? nextSeoTitle : prev.seoTitle,
      seoKeywords:
        !prev.seoKeywords.trim() || prev.seoKeywords === autoEditSeoRef.current.seoKeywords
          ? nextSeoKeywords
          : prev.seoKeywords,
      seoDescription:
        !prev.seoDescription.trim() || prev.seoDescription === autoEditSeoRef.current.seoDescription
          ? nextSeoDescription
          : prev.seoDescription,
    }));

    autoEditSeoRef.current = {
      seoTitle: nextSeoTitle,
      seoKeywords: nextSeoKeywords,
      seoDescription: nextSeoDescription,
    };
  }, [documentKind, editContent, editDocumentMeta.intro, editSlug, editTitle, editingId, isDocumentTab]);

  useEffect(() => {
    if (!message) return;
    if (pendingPreviewScroll) return;
    if (suppressMessageScrollRef.current) {
      suppressMessageScrollRef.current = false;
      return;
    }
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message, pendingPreviewScroll]);

  useEffect(() => {
    if (!pendingPreviewScroll) return;
    const ref = pendingPreviewScroll === "publish" ? publishCoverPreviewRef : editCoverPreviewRef;
    const hasPreview = pendingPreviewScroll === "publish" ? (coverPreviewSrc || coverImage) : (editCoverPreviewSrc || editCoverImage);
    if (!hasPreview) return;

    let cancelled = false;
    let attempts = 0;

    const run = () => {
      if (cancelled) return;
      attempts += 1;
      const element = ref.current;
      if (element) {
        element.scrollIntoView({ behavior: attempts === 1 ? "auto" : "smooth", block: "center" });
      }
      if (attempts >= 4) {
        setPendingPreviewScroll(null);
        return;
      }
      window.setTimeout(run, 160);
    };

    window.requestAnimationFrame(run);
    return () => {
      cancelled = true;
    };
  }, [coverImage, editCoverImage, coverPreviewSrc, editCoverPreviewSrc, pendingPreviewScroll]);

  useEffect(() => {
    if (!editingId) return;
    window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [editingId]);

  function getPublishSourceText() {
    return (
      safeTab === "brands"
          ? brandStructuredToSearchText(brandStructured)
          : safeTab === "terms"
            ? content
          : safeTab === "standards"
            ? content
            : safeTab === "industry-data"
              ? dataStructuredToSearchText(dataStructured)
              : safeTab === "awards"
                ? awardStructuredToSearchText(awardStructured)
                : content
    ).trim();
  }

  function getEditSourceText() {
    return (
      safeTab === "brands"
          ? brandStructuredToSearchText(editBrandStructured)
          : safeTab === "terms"
            ? editContent
          : safeTab === "standards"
            ? editContent
            : safeTab === "industry-data"
              ? dataStructuredToSearchText(editDataStructured)
              : safeTab === "awards"
                ? awardStructuredToSearchText(editAwardStructured)
                : editContent
    ).trim();
  }

  function autoFillExcerpt() {
    const nextExcerpt = buildGeoExcerpt(title, getPublishSourceText(), 120);
    if (!nextExcerpt) {
      suppressMessageScrollRef.current = true;
      setMessage("未提取到可用于生成摘要的正文内容，请先补充内容。");
      return;
    }
    setExcerpt(nextExcerpt);
    suppressMessageScrollRef.current = true;
    setMessage("已根据正文提炼摘要，结果更利于搜索抓取与页面概览。");
  }

  function autoFillEditExcerpt() {
    const nextExcerpt = buildGeoExcerpt(editTitle, getEditSourceText(), 120);
    if (!nextExcerpt) {
      suppressMessageScrollRef.current = true;
      setMessage("未提取到可用于生成摘要的正文内容，请先补充内容。");
      return;
    }
    setEditExcerpt(nextExcerpt);
    suppressMessageScrollRef.current = true;
    setMessage("已根据正文提炼摘要，结果更利于搜索抓取与页面概览。");
  }

  function resetBrandStructured() {
    setBrandStructured(createDefaultBrandStructuredData());
  }

  function resetStandardStructured() {
    setStandardStructured(createDefaultStandardStructuredData());
  }
  function resetDataStructured() {
    setDataStructured(createDefaultDataStructuredData());
  }
  function resetAwardStructured() {
    setAwardStructured(createDefaultAwardStructuredData());
  }

  const replacePreviewUrl = useCallback((kind: "publish" | "edit", nextUrl: string) => {
    const targetRef = kind === "publish" ? publishObjectUrlRef : editObjectUrlRef;
    const setPreview = kind === "publish" ? setCoverPreviewSrc : setEditCoverPreviewSrc;
    if (targetRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(targetRef.current);
    }
    targetRef.current = nextUrl.startsWith("blob:") ? nextUrl : null;
    setPreview(nextUrl);
  }, []);

  function queuePreviewScroll(target: "publish" | "edit") {
    setPendingPreviewScroll(target);
  }

  useEffect(() => {
    setCoverImage("");
    replacePreviewUrl("publish", "");
    setSource("");
    setDisplayAuthor("");
    setConceptSummary("");
    setApplicableScenarios("");
    setVersionLabel("");
    setRelatedTermSlugs("");
    setRelatedStandardIds("");
    setRelatedBrandIds("");
    setTagSlugs("");
    setSlug("");
    autoSlugRef.current = "";
    autoSeoRef.current = { seoTitle: "", seoKeywords: "", seoDescription: "" };
    setDocumentMeta(createEmptyDocumentMetadata());
  }, [safeTab, replacePreviewUrl]);

  useEffect(() => {
    if (safeTab === "brands") resetBrandStructured();
    if (safeTab === "standards") resetStandardStructured();
    if (safeTab === "industry-data") resetDataStructured();
    if (safeTab === "awards") resetAwardStructured();
  }, [safeTab]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading || !selectedCategory || !selectedCategoryAccess?.enabled) return;
    if (safeTab !== "brands" && subOptions.length > 0 && !activeSubAccess?.enabled) {
      setMessage("当前子栏目未开通投稿权限，请联系管理员授权。");
      return;
    }
    setLoading(true);
    setMessage("");
    setLastSubmitted(null);

    const composedContent =
      safeTab === "brands"
          ? buildBrandStructuredHtml(brandStructured)
          : safeTab === "terms"
            ? normalizeTermContent(content)
          : safeTab === "standards"
            ? content.trim()
            : safeTab === "industry-data"
              ? buildDataStructuredHtml(dataStructured)
              : safeTab === "awards"
                ? buildAwardStructuredHtml(awardStructured)
                : content.trim();

    const payload = {
      title: title.trim(),
      slug: slug.trim() || null,
      source: source.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      displayAuthor: displayAuthor.trim() || null,
      excerpt: excerpt.trim() || null,
      content: composedContent,
      categoryHref: selectedCategory.href,
      subHref: safeTab === "brands" ? null : subHref,
      coverImage:
        safeTab === "brands"
          ? brandStructured.logoUrl.trim() || null
          : coverImage.trim() || null,
      conceptSummary: conceptSummary.trim() || null,
      applicableScenarios:
        safeTab === "standards"
          ? standardStructured.scope.trim() || null
          : safeTab === "industry-data"
            ? dataStructured.methodology.trim() || null
          : applicableScenarios.trim() || null,
      versionLabel:
        safeTab === "standards"
          ? standardStructured.versionNote.trim() || null
          : safeTab === "awards"
            ? (awardStructured.year ? `${awardStructured.year}版` : null)
          : versionLabel.trim() || null,
      relatedTermSlugs: relatedTermSlugs.trim() || null,
      relatedStandardIds: relatedStandardIds.trim() || null,
      relatedBrandIds: relatedBrandIds.trim() || null,
      tagSlugs: tagSlugs.trim() || null,
      faqJson: safeTab === "terms" || safeTab === "standards" ? stringifyDocumentMetadata(documentMeta) : null,
      syncToMainSite: true,
      isPinned,
    };

    const res = await fetch("/api/member/articles", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "提交失败");
      setLoading(false);
      return;
    }

    const nextStatus = typeof data?.status === "string" ? data.status : "";
    const submittedTitle = typeof data?.title === "string" ? data.title : payload.title;
    const submittedStatus = (nextStatus || "pending") as Status;
    const previewHref = buildPreviewHref(
      typeof data?.categoryHref === "string" ? data.categoryHref : payload.categoryHref,
      typeof data?.subHref === "string" ? data.subHref : payload.subHref,
      typeof data?.id === "string" ? data.id : null,
      typeof data?.slug === "string" ? data.slug : null,
      submittedTitle
    );
    setLastSubmitted({ title: submittedTitle, href: previewHref, status: submittedStatus });
    setMessage(nextStatus === "approved" ? "提交成功，内容已发布。" : "提交成功，已进入审核流程。");
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    resetBrandStructured();
    resetStandardStructured();
    resetDataStructured();
    resetAwardStructured();
    setCoverImage("");
    replacePreviewUrl("publish", "");
    setSource("");
    setSourceUrl("");
    setDisplayAuthor("");
    setConceptSummary("");
    setApplicableScenarios("");
    setVersionLabel("");
    setRelatedTermSlugs("");
    setRelatedStandardIds("");
    setRelatedBrandIds("");
    setTagSlugs("");
    setDocumentMeta(createEmptyDocumentMetadata());
    autoSlugRef.current = "";
    autoSeoRef.current = { seoTitle: "", seoKeywords: "", seoDescription: "" };
    setIsPinned(false);
    await load();
    setLoading(false);
  }

  const openEditRequest = useCallback((item: Row) => {
    const nextMeta = parseDocumentMetadata(item.faqJson);
    setEditingId(item.id);
    setEditSlug(item.slug ?? "");
    setEditTitle(item.title ?? "");
    setEditExcerpt(item.excerpt ?? "");
    setEditContent(safeTab === "terms" ? formatTermContentForEditing(item.content ?? "") : (item.content ?? ""));
    setEditBrandStructured(
      safeTab === "brands"
        ? parseBrandStructuredHtml(item.content ?? "") ?? createDefaultBrandStructuredData()
        : createDefaultBrandStructuredData()
    );
    setEditStandardStructured(
      safeTab === "standards"
        ? parseStandardStructuredHtml(item.content ?? "") ?? createDefaultStandardStructuredData()
        : createDefaultStandardStructuredData()
    );
    setEditDataStructured(
      safeTab === "industry-data"
        ? parseDataStructuredHtml(item.content ?? "") ?? createDefaultDataStructuredData()
        : createDefaultDataStructuredData()
    );
    setEditAwardStructured(
      safeTab === "awards"
        ? parseAwardStructuredHtml(item.content ?? "") ?? createDefaultAwardStructuredData()
        : createDefaultAwardStructuredData()
    );
    setEditCoverImage(item.coverImage ?? "");
    replacePreviewUrl("edit", item.coverImage ?? "");
    setEditReason("");
    setEditDocumentMeta(nextMeta);
    autoEditSlugRef.current = slugify(item.title ?? "");
    const nextAutoEditSeo = hasAutoSeoSource(nextMeta.intro, item.content ?? "")
      ? {
          seoTitle: buildAutoSeoTitle(item.title ?? ""),
          seoKeywords: buildAutoSeoKeywords(item.title ?? "", safeTab === "standards" ? "standards" : "terms"),
          seoDescription: buildAutoSeoDescription(item.title ?? "", nextMeta.intro, item.content ?? ""),
        }
      : { seoTitle: "", seoKeywords: "", seoDescription: "" };
    autoEditSeoRef.current = {
      ...nextAutoEditSeo,
    };
  }, [safeTab, replacePreviewUrl]);

  useEffect(() => {
    if (!editQueryId) {
      autoOpenedEditIdRef.current = "";
      return;
    }
    if (autoOpenedEditIdRef.current === editQueryId) return;

    const currentItem = items.find((item) => item.id === editQueryId);
    if (currentItem) {
      openEditRequest(currentItem);
      autoOpenedEditIdRef.current = editQueryId;
      return;
    }

    let cancelled = false;

    async function loadEditItem() {
      const response = await fetch(`/api/member/articles/${editQueryId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;

      const item = (await response.json().catch(() => null)) as Row | null;
      if (!item || cancelled) return;

      setItems((current) => (current.some((entry) => entry.id === item.id) ? current : [item, ...current]));
      openEditRequest(item);
      autoOpenedEditIdRef.current = editQueryId;
    }

    void loadEditItem();
    return () => {
      cancelled = true;
    };
  }, [editQueryId, items, openEditRequest]);

  async function submitEditRequest(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const composedEditContent =
      safeTab === "brands"
          ? buildBrandStructuredHtml(editBrandStructured)
          : safeTab === "terms"
            ? normalizeTermContent(editContent)
          : safeTab === "standards"
            ? editContent.trim()
            : safeTab === "industry-data"
              ? buildDataStructuredHtml(editDataStructured)
              : safeTab === "awards"
                ? buildAwardStructuredHtml(editAwardStructured)
                : editContent;
    const res = await fetch(`/api/member/articles/${editingId}/changes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        slug: editSlug,
        excerpt: editExcerpt,
        content: composedEditContent,
        coverImage: safeTab === "brands" ? editBrandStructured.logoUrl.trim() || null : editCoverImage.trim() || null,
        reason: editReason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "修改申请提交失败");
      return;
    }
    setMessage("修改申请已提交，待主管理员审核后生效");
    setEditingId(null);
  }

  function autoFillTags() {
    const tags = suggestTagsForGeo({
      title,
      excerpt,
      content: getPublishSourceText(),
      categoryHref: selectedCategory?.href,
      subHref,
    });
    if (tags.length === 0) {
      suppressMessageScrollRef.current = true;
      setMessage("未识别到明显行业关键词，请手动补充。");
      return;
    }
    setTagSlugs(tags.join(","));
    suppressMessageScrollRef.current = true;
    setMessage(`已按标题、摘要、正文和栏目语义提取 ${tags.length} 个行业关键词。`);
  }

  async function handleCoverImageUpload(file: File | null) {
    if (!file) return;
    try {
      replacePreviewUrl("publish", URL.createObjectURL(file));
      queuePreviewScroll("publish");
      const imageUrl = await uploadImageToServer(file, {
        folder: "content/covers",
        maxBytes: COVER_IMAGE_MAX_BYTES,
      });
      setCoverImage(imageUrl);
      suppressMessageScrollRef.current = true;
      setMessage("顶部配图已加载，可先预览，提交后生效。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片上传失败");
    }
  }

  async function handleEditCoverImageUpload(file: File | null) {
    if (!file) return;
    try {
      replacePreviewUrl("edit", URL.createObjectURL(file));
      queuePreviewScroll("edit");
      const imageUrl = await uploadImageToServer(file, {
        folder: "content/covers",
        maxBytes: COVER_IMAGE_MAX_BYTES,
      });
      setEditCoverImage(imageUrl);
      suppressMessageScrollRef.current = true;
      setMessage("顶部配图已加载，可先预览，提交后生效。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片上传失败");
    }
  }

  async function applyCroppedCover(file: File, target: "publish" | "edit") {
    const imageUrl = await uploadImageToServer(file, {
      folder: "content/covers",
      maxBytes: COVER_IMAGE_MAX_BYTES,
    });
    if (target === "publish") {
      replacePreviewUrl("publish", URL.createObjectURL(file));
      setCoverImage(imageUrl);
      queuePreviewScroll("publish");
    } else {
      replacePreviewUrl("edit", URL.createObjectURL(file));
      setEditCoverImage(imageUrl);
      queuePreviewScroll("edit");
    }
    suppressMessageScrollRef.current = true;
    setMessage("顶部配图已裁剪并更新预览。");
    setCropTarget(null);
  }

  function renderCategoryFeatureFields(currentTab: ContentTabKey) {
    return (
      <>
        {currentTab === "terms" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm text-muted">词条正文</label>
              <p className="text-xs text-muted">可直接按普通文本输入，系统会自动识别“一、二、三”这类标题并整理为词条结构。</p>
            </div>
            <textarea
              className="w-full min-h-[320px] rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-7 text-primary"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"示例：\n一、概述\n全屋整木定制是在整木定制基础上，实现全空间覆盖的系统化木作解决方案。\n\n二、基本信息\n覆盖范围：全屋\n核心：整体设计"}
            />
          </div>
        )}

        {currentTab === "standards" && (
          <div className="space-y-2">
            <label className="block text-sm text-muted">标准正文</label>
            <RichEditor
              value={content}
              onChange={setContent}
              minHeight={360}
              placeholder="支持标题分级、表格、图片和条款结构的标准正文编辑。"
            />
          </div>
        )}

        {currentTab === "industry-data" && (
          <div className="space-y-2">
            <label className="block text-sm text-muted">数据结构化内容</label>
            <DataStructuredEditor value={dataStructured} onChange={setDataStructured} />
          </div>
        )}

        {currentTab === "awards" && (
          <div className="space-y-2">
            <label className="block text-sm text-muted">评选结构化内容</label>
            <AwardStructuredEditor value={awardStructured} onChange={setAwardStructured} />
          </div>
        )}

        {false && currentTab === "standards" && (
          <>
            <label className="block text-sm text-muted">版本标签</label>
            <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
            <label className="block text-sm text-muted">关联标准 ID（逗号分隔）</label>
            <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={relatedStandardIds} onChange={(e) => setRelatedStandardIds(e.target.value)} />
          </>
        )}

        {(currentTab === "brands" || currentTab === "awards" || currentTab === "articles") && (
          <>
            <label className="block text-sm text-muted">关联品牌 ID（逗号分隔）</label>
            <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={relatedBrandIds} onChange={(e) => setRelatedBrandIds(e.target.value)} />
          </>
        )}

        <>
          <label className="block text-sm text-muted">关键词（逗号分隔）</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-border rounded px-3 py-2 bg-surface"
              value={tagSlugs}
              onChange={(e) => setTagSlugs(e.target.value)}
              placeholder="如：整木定制,门墙柜一体,渠道招商"
            />
            <button type="button" onClick={autoFillTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">
              行业提取
            </button>
          </div>
        </>
      </>
    );
  }

  if (authed === false) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后再使用内容发布中心。</p>
        <Link href="/membership/login" className="apple-inline-link">前往登录</Link>
      </div>
    );
  }

  const enterpriseHref = enterprise?.id || latestVerification?.approvedEnterpriseId ? `/enterprise/${enterprise?.id ?? latestVerification?.approvedEnterpriseId}` : null;
  const verificationActionHref =
    latestVerification?.status === "pending"
      ? "/membership/content/verification"
      : latestVerification?.status === "rejected"
        ? "/membership/content/verification"
        : enterpriseHref ?? "/membership/content/verification";
  const verificationActionLabel =
    latestVerification?.status === "pending"
      ? "查看认证进度"
      : latestVerification?.status === "rejected"
        ? "重新提交认证资料"
        : enterpriseHref
          ? "查看企业主页"
          : "去提交企业认证资料";
  const verificationStatusText =
    latestVerification?.status === "approved"
      ? "企业认证已通过，企业详情页已生成。"
      : latestVerification?.status === "pending"
        ? "企业认证资料已提交，当前正在审核中。"
        : latestVerification?.status === "rejected"
          ? "企业认证曾被驳回，可按审核意见补充后重新提交。"
          : "完成企业认证后可获得企业详情展示页，并同步企业资料。";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">内容发布中心</span>
      </nav>

      <section className="mb-6 overflow-hidden rounded-[30px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,239,230,0.9))] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-primary">内容发布中心</h1>
              <p className="mt-3 text-sm text-muted">
                当前身份：{role === "SUPER_ADMIN" ? "主管理员" : role === "ADMIN" ? "子管理员" : "会员"} /{" "}
                {memberType === "enterprise_advanced" ? "企业VIP会员" : memberType === "enterprise_basic" ? "企业基础会员" : "个人会员"}
              </p>
              <p className="mt-2 text-sm text-muted">栏目保持全量可见，未开通栏目会锁定；已开通栏目按 {memberAccess.year} 年授权执行。</p>
              <p className="mt-2 text-sm text-muted">{verificationStatusText}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <InlinePageBackLink href="/membership" label="返回会员系统" />
              <Link href="/membership/account-security" className="apple-inline-link">
                账号安全
              </Link>
              <Link href={verificationActionHref} className="apple-inline-link">
                {verificationActionLabel}
              </Link>
              {memberType !== "personal" ? (
                <Link href="/membership/content/site" className="apple-inline-link">
                  管理会员站
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid gap-3 px-6 py-5 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">当前栏目</p>
            <p className="mt-2 text-lg font-semibold text-primary">{selectedTabDef.label}</p>
            <p className="mt-2 text-sm text-muted">{selectedCategoryQuotaLabel}</p>
          </article>
          <article className="rounded-2xl border border-border bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">当前子栏目</p>
            <p className="mt-2 text-lg font-semibold text-primary">{activeSubAccess?.label ?? "待选择"}</p>
            <p className="mt-2 text-sm text-muted">{selectedSubcategoryQuotaLabel}</p>
          </article>
          <article className="rounded-2xl border border-border bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">栏目状态</p>
            <p className="mt-2 text-lg font-semibold text-primary">{enabledSubcategoryCount} 个已开通子栏目</p>
            <p className="mt-2 text-sm text-muted">个体授权可以把基础会员额度单独提升到高于默认值。</p>
          </article>
        </div>
      </section>

      {memberType === "enterprise_basic" ? (
        <section className="mb-6 rounded-[28px] border border-[rgba(180,154,107,0.22)] bg-[linear-gradient(135deg,rgba(255,249,239,0.98),rgba(247,238,222,0.88))] p-5 shadow-[0_18px_46px_rgba(180,154,107,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">企业基础会员</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">升级到企业VIP，获得更完整的企业展示与运营能力</h2>
              <p className="mt-2 text-sm text-muted">
                VIP 会员可获得更完整的企业站配置、SEO 设置、推荐能力与更高内容运营上限。已认证企业可在现有基础上直接升级，不影响企业详情页展示。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
                <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-3 py-1">企业站增强</span>
                <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-3 py-1">SEO 设置</span>
                <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-3 py-1">推荐位能力</span>
                <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-3 py-1">更高扩展权限</span>
              </div>
            </div>
            <div className="flex min-w-[240px] flex-col items-start gap-2">
              <Link
                href={`tel:${PUBLIC_CONTACT_PHONE}`}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_28px_rgba(180,154,107,0.25)] transition hover:brightness-105"
              >
                联系管理员升级VIP
              </Link>
              <p className="text-xs text-muted">升级由平台管理员处理，可直接电话联系：{PUBLIC_CONTACT_PHONE}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid lg:grid-cols-[220px_1fr] gap-4 mb-8">
        <aside className="rounded-[28px] border border-border bg-surface-elevated p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">发布栏目</p>
          <ul className="space-y-1">
            {allCategoryAccess.map((cat) => {
              const catTab = tabFromHref(cat.href);
              const active = catTab === safeTab;
              return (
                <li key={cat.href}>
                  {cat.enabled ? (
                    <Link
                      href={`/membership/content/publish?tab=${catTab}`}
                      className={`block rounded-2xl px-3 py-3 text-sm font-medium transition ${
                        active
                          ? "border border-accent/25 bg-[linear-gradient(135deg,rgba(186,158,108,0.18),rgba(255,255,255,0.92))] text-accent shadow-[0_10px_26px_rgba(138,115,77,0.10)]"
                          : "border border-transparent text-primary hover:border-border hover:bg-surface hover:text-accent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{cat.label}</span>
                        <span className="text-[11px] text-muted">{formatQuota(cat.annualLimit, cat.remainingCount)}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-muted/80">
                      <div className="flex items-center justify-between gap-2">
                        <span>{cat.label}</span>
                        <span className="text-[11px]">未开通</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
            <div className="mt-4 rounded-2xl border border-border bg-surface px-3 py-3 text-xs text-muted">
              当前栏目：<span className="text-primary">{selectedTabDef.label}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,243,236,0.94))] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">已发内容</p>
              <p className="mt-2 text-sm text-primary">
                当前栏目共 {filteredItems.length} 条，已通过 {filteredStatusSummary.approved} 条，待审核 {filteredStatusSummary.pending} 条。
              </p>
              <p className="mt-2 text-xs leading-6 text-muted">
                每页展示 20 条，不显示阅读量。点击后可查看全部历史内容、预览已通过稿件，或继续修改。
              </p>
              <Link
                href={`/membership/content/submissions?tab=${encodeURIComponent(safeTab)}`}
                className="mt-3 inline-flex rounded-full border border-border bg-white/85 px-3 py-2 text-xs font-medium text-primary transition hover:bg-white hover:text-accent"
              >
                查看当前栏目内容
              </Link>
            </div>
          </aside>

        <div className="space-y-4">
        <form onSubmit={submit} className="rounded-[28px] border border-border bg-surface-elevated p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] space-y-4">
          {!selectedCategoryAccess && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
              当前账号还没有开通任何发布栏目，请联系管理员分配子栏目和年度数量。
            </div>
          )}
          {message && (
            <div ref={messageRef} className="scroll-mt-24 space-y-1">
              <p className="text-sm text-accent">{message}</p>
              {lastSubmitted && (
                <div className="text-xs text-muted">
                  {lastSubmitted.status === "approved" && lastSubmitted.href ? (
                    <>
                      点击标题预览：
                      <Link href={lastSubmitted.href} target="_blank" rel="noreferrer" className="ml-1 text-accent hover:underline">
                        {lastSubmitted.title}
                      </Link>
                    </>
                  ) : (
                    <>
                      提交内容：<span className="text-primary">{lastSubmitted.title}</span>
                      {lastSubmitted.href && <span className="ml-2">审核通过后可预览</span>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {safeTab !== "brands" && subOptions.length > 0 && (
            <>
              <label className="block text-sm text-muted">子栏目</label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
                {subOptions.map((s) => {
                  const active = subHref === s.href;
                  const disabled = !s.enabled;
                  return (
                    <button
                      key={s.href}
                      type="button"
                      onClick={() => {
                        if (!disabled) setSubHref(s.href);
                      }}
                      disabled={disabled}
                      className={`px-3 py-1.5 rounded-md text-sm transition ${
                        disabled
                          ? "cursor-not-allowed border border-dashed border-border text-muted/70 bg-surface"
                          : active
                            ? "bg-accent text-white"
                            : "bg-surface-elevated text-primary border border-border hover:bg-surface"
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className={`ml-2 text-[11px] ${disabled || !active ? "opacity-80" : "text-white/80"}`}>
                        {disabled ? "未开通" : formatQuota(s.annualLimit, s.remainingCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {safeTab === "brands" && (
            <>
              <label className="block text-sm text-muted">区域选择</label>
              <select
                className="w-full border border-border rounded px-3 py-2 bg-surface"
                value={brandStructured.serviceAreas || "全国"}
                onChange={(e) => setBrandStructured((prev) => ({ ...prev, serviceAreas: e.target.value }))}
              >
                {BRAND_REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="block text-sm text-muted">标题</label>
          <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className={`grid gap-3 ${(role === "SUPER_ADMIN" || role === "ADMIN") ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "md:grid-cols-2"}`}>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
              <label className="mb-2 block text-sm font-medium text-primary">作者</label>
              <input
                className="w-full border-0 bg-transparent px-0 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none"
                value={displayAuthor}
                onChange={(e) => setDisplayAuthor(e.target.value)}
                placeholder="如：编辑部 / 张三"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3">
              <label className="mb-2 block text-sm font-medium text-primary">来源</label>
              <input
                className="w-full border-0 bg-transparent px-0 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="如：整木网 / 品牌官方"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-primary">原文链接</label>
              <input
                className="w-full border-0 bg-transparent px-0 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="如：https://example.com/article"
                inputMode="url"
              />
            </div>
            {(role === "SUPER_ADMIN" || role === "ADMIN") && (
              <div className={`rounded-2xl border px-4 py-3 transition md:min-w-[168px] ${isPinned ? "border-[rgba(180,154,107,0.54)] bg-[linear-gradient(180deg,rgba(202,174,121,0.2),rgba(180,154,107,0.14))] shadow-[0_18px_34px_-24px_rgba(180,154,107,0.6)]" : "border-border bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,243,236,0.94))] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)]"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">置顶</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinned((value) => !value)}
                    className={`inline-flex min-w-[86px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isPinned
                        ? "border-[rgba(180,154,107,0.6)] bg-[#b49a6b] text-white shadow-[0_10px_24px_-18px_rgba(180,154,107,0.8)]"
                        : "border-border bg-white/90 text-primary hover:border-[rgba(180,154,107,0.45)] hover:bg-white"
                    }`}
                  >
                    {isPinned ? "已置顶" : "设为置顶"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {safeTab === "articles" && (
            <div className="rounded-2xl border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,243,236,0.94))] px-4 py-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">默认同步到整木资讯</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    企业会员在这里发布的资讯，审核通过后会直接进入整木资讯栏目中的企业动态内容，同时自动汇总到你的企业页“企业动态”，不需要再单独同步。
                  </p>
                </div>
                <span className="inline-flex min-w-[128px] items-center justify-center rounded-full border border-[rgba(180,154,107,0.32)] bg-white/92 px-4 py-2 text-sm font-medium text-primary shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
                  发布后自动同步
                </span>
              </div>
            </div>
          )}
          {(safeTab === "terms" || safeTab === "standards") && (
            <>
              <label className="block text-sm text-muted">文档 Slug</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-surface"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="留空则按标题自动生成，建议使用拼音或英文短链"
              />
            </>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm text-muted">{safeTab === "standards" ? "标准摘要" : "摘要"}</label>
            <button type="button" onClick={autoFillExcerpt} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-surface">自动生成摘要</button>
          </div>
          <textarea
            className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          {(safeTab === "terms" || safeTab === "standards") && (
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <p className="text-sm font-medium text-primary">文档信息</p>
              <textarea
                className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[88px]"
                value={documentMeta.intro}
                onChange={(e) => setDocumentMeta((prev) => ({ ...prev, intro: e.target.value }))}
                placeholder={safeTab === "terms" ? "词条简介，用一段话说明术语定义与适用语境。" : "标准简介，用一段话说明标准适用范围和核心价值。"}
              />
              {safeTab === "standards" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.standardCode} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, standardCode: e.target.value }))} placeholder="标准编号" />
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="当前版本，如 V1.0" />
                  <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px] md:col-span-2" value={documentMeta.scope} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, scope: e.target.value }))} placeholder="适用范围" />
                  <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.materialRequirements} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, materialRequirements: e.target.value }))} placeholder="材料要求" />
                  <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.processRequirements} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, processRequirements: e.target.value }))} placeholder="工艺要求" />
                  <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.executionFlow} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, executionFlow: e.target.value }))} placeholder="执行流程" />
                  <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.acceptanceCriteria} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} placeholder="验收标准" />
                </div>
              )}
              <p className="text-xs text-muted">填写简介和正文内容后，系统会自动生成 SEO；手动修改后将不再自动覆盖。</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoTitle} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoTitle: e.target.value }))} placeholder="SEO 标题" />
                <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoKeywords} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoKeywords: e.target.value }))} placeholder="SEO 关键词，逗号分隔" />
                <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoDescription} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoDescription: e.target.value }))} placeholder="SEO 描述" />
              </div>
              {safeTab === "standards" && (
                <>
                  <label className="block text-sm text-muted">参与单位（每行一个，格式：企业名称|参与时间）</label>
                  <textarea
                    className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[88px]"
                    value={documentMeta.contributors.map((item) => `${item.name}${item.joinedAt ? `|${item.joinedAt}` : ""}`).join("\n")}
                    onChange={(e) =>
                      setDocumentMeta((prev) => ({
                        ...prev,
                        contributors: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                          const [name, joinedAt] = line.split("|").map((part) => part.trim());
                          return { name, joinedAt };
                        }),
                      }))
                    }
                    placeholder="示例：某某整木|2026-03-18"
                  />
                  <label className="block text-sm text-muted">版本记录（每行一个，格式：版本|更新时间|修改说明）</label>
                  <textarea
                    className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[110px]"
                    value={documentMeta.versions.map((item) => [item.version, item.updatedAt, item.note].filter(Boolean).join("|")).join("\n")}
                    onChange={(e) =>
                      setDocumentMeta((prev) => ({
                        ...prev,
                        versions: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                          const [version, updatedAt, note] = line.split("|").map((part) => part.trim());
                          return { version: version || "未命名版本", updatedAt, note };
                        }),
                      }))
                    }
                    placeholder="示例：V1.0|2026-03-18|首版发布"
                  />
                </>
              )}
            </div>
          )}

          {safeTab !== "brands" && (
            <>
              <label className="block text-sm text-muted">顶部配图（可选）</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-surface"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="可填写图片 URL，或使用下方上传按钮"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    void handleCoverImageUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                  className="block"
                />
                <span>支持本地上传，最大 2MB</span>
                {(coverPreviewSrc || coverImage) && (
                  <button
                    type="button"
                    onClick={() => { setCoverImage(""); replacePreviewUrl("publish", ""); }}
                    className="px-2 py-1 rounded border border-border hover:bg-surface"
                  >
                    清除
                  </button>
                )}
                {(coverPreviewSrc || coverImage) && (
                  <button
                    type="button"
                    onClick={() => setCropTarget("publish")}
                    className="px-2 py-1 rounded border border-border hover:bg-surface"
                  >
                    裁剪
                  </button>
                )}
              </div>
              {safeTab === "terms" && <p className="text-xs text-muted">最佳尺寸：1600 x 900 px，建议使用横版 16:9 图片。</p>}
              {(coverPreviewSrc || coverImage) && (
                <div ref={publishCoverPreviewRef} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs text-muted mb-2">顶部配图预览</p>
                  {/* 这里允许预览任意已上传地址，使用原生 img 可避免远程域名限制阻断后台预览。 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveUploadedImageUrl(coverPreviewSrc || coverImage)} alt="" className="max-h-80 w-full rounded-lg border border-border bg-surface-elevated object-contain" loading="lazy" />
                </div>
              )}
            </>
          )}


          {safeTab !== "terms" &&
            safeTab !== "brands" &&
            safeTab !== "standards" &&
            safeTab !== "industry-data" &&
            safeTab !== "awards" && (
            <>
              <label className="block text-sm text-muted">正文</label>
              <RichEditor value={content} onChange={setContent} minHeight={280} placeholder="" allowClipboardImagePaste={canPasteImages} />
            </>
          )}
          {safeTab === "brands" && (
            <>
              <label className="block text-sm text-muted">品牌结构化内容</label>
              <BrandStructuredEditor value={brandStructured} onChange={setBrandStructured} />
            </>
          )}

          {renderCategoryFeatureFields(safeTab)}

          <button className="px-4 py-2 rounded bg-accent text-white text-sm disabled:opacity-50" disabled={loading}>
            {loading ? "提交中..." : "提交审核"}
          </button>
        </form>

      </div>
      </div>

      {editingId && (
        <section ref={editFormRef} className="mt-6 rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="text-sm font-medium text-primary mb-3">提交修改申请</h2>
          <form onSubmit={submitEditRequest} className="space-y-3">
            <label className="block text-sm text-muted">新标题</label>
            <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm text-muted">{safeTab === "standards" ? "标准摘要" : "新摘要"}</label>
              <button type="button" onClick={autoFillEditExcerpt} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-surface">自动生成摘要</button>
            </div>
            <textarea
              className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y"
              value={editExcerpt}
              onChange={(e) => setEditExcerpt(e.target.value)}
            />
            {safeTab !== "brands" && (
              <>
                <label className="block text-sm text-muted">新顶部配图（可选）</label>
                <input
                  className="w-full border border-border rounded px-3 py-2 bg-surface"
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  placeholder="可填写图片 URL，或使用下方上传按钮"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      void handleEditCoverImageUpload(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                    className="block"
                  />
                  <span>支持本地上传，最大 2MB</span>
                  {(editCoverPreviewSrc || editCoverImage) && (
                    <button
                      type="button"
                      onClick={() => { setEditCoverImage(""); replacePreviewUrl("edit", ""); }}
                      className="px-2 py-1 rounded border border-border hover:bg-surface"
                    >
                      清除
                    </button>
                  )}
                  {(editCoverPreviewSrc || editCoverImage) && (
                    <button
                      type="button"
                      onClick={() => setCropTarget("edit")}
                      className="px-2 py-1 rounded border border-border hover:bg-surface"
                    >
                      裁剪
                    </button>
                  )}
                </div>
                {safeTab === "terms" && <p className="text-xs text-muted">最佳尺寸：1600 x 900 px，建议使用横版 16:9 图片。</p>}
                {(editCoverPreviewSrc || editCoverImage) && (
                  <div ref={editCoverPreviewRef} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-xs text-muted mb-2">顶部配图预览</p>
                    {/* 这里允许预览任意已上传地址，使用原生 img 可避免远程域名限制阻断后台预览。 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveUploadedImageUrl(editCoverPreviewSrc || editCoverImage)} alt="" className="max-h-80 w-full rounded-lg border border-border bg-surface-elevated object-contain" loading="lazy" />
                  </div>
                )}
              </>
            )}
            {safeTab === "terms" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm text-muted">词条正文</label>
                  <p className="text-xs text-muted">可直接按普通文本修改，系统会自动整理结构。</p>
                </div>
                <textarea
                  className="w-full min-h-[320px] rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-7 text-primary"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={"示例：\n一、概述\n全屋整木定制是在整木定制基础上，实现全空间覆盖的系统化木作解决方案。\n\n二、基本信息\n覆盖范围：全屋\n核心：整体设计"}
                />
              </div>
            ) : safeTab === "brands" ? (
              <>
                <label className="block text-sm text-muted">品牌结构化内容</label>
                <BrandStructuredEditor value={editBrandStructured} onChange={setEditBrandStructured} />
              </>
            ) : safeTab === "standards" ? (
              <>
                <label className="block text-sm text-muted">标准结构化内容</label>
                <StandardStructuredEditor value={editStandardStructured} onChange={setEditStandardStructured} />
              </>
            ) : safeTab === "industry-data" ? (
              <>
                <label className="block text-sm text-muted">数据结构化内容</label>
                <DataStructuredEditor value={editDataStructured} onChange={setEditDataStructured} />
              </>
            ) : safeTab === "awards" ? (
              <>
                <label className="block text-sm text-muted">评选结构化内容</label>
                <AwardStructuredEditor value={editAwardStructured} onChange={setEditAwardStructured} />
              </>
            ) : (
              <>
                <label className="block text-sm text-muted">新正文</label>
                <RichEditor value={editContent} onChange={setEditContent} minHeight={260} placeholder="" allowClipboardImagePaste={canPasteImages} />
              </>
            )}
            <label className="block text-sm text-muted">修改说明</label>
            <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="例如：修正数据口径和段落结构" />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded bg-accent text-white text-sm">提交申请</button>
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded border border-border text-sm">取消</button>
            </div>
          </form>
        </section>
      )}

      {cropTarget && (
        <ImageCropDialog
          source={resolveUploadedImageUrl(cropTarget === "publish" ? (coverPreviewSrc || coverImage) : (editCoverPreviewSrc || editCoverImage))}
          onCancel={() => setCropTarget(null)}
          onConfirm={async (file) => {
            await applyCroppedCover(file, cropTarget);
          }}
        />
      )}
    </div>
  );
}

export default function PublishCenterPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-sm text-muted">加载中...</div>}>
      <PublishCenterPageInner />
    </Suspense>
  );
}
