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
import { buildGeoExcerpt, previewText } from "@/lib/text";
import { suggestTagsForGeo } from "@/lib/tag-suggest";

type MemberType = "enterprise_basic" | "enterprise_advanced" | "personal";
type Status = "draft" | "pending" | "approved" | "rejected";
type TermSection = { id: string; heading: string; body: string };
const BRAND_REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;
type SubmitPreview = { title: string; href: string | null; status: Status };

type Row = {
  id: string;
  title: string;
  slug: string;
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
  createdAt: string;
};

const STATUS_TEXT: Record<Status, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

const DEFAULT_TERM_SECTIONS: Omit<TermSection, "id">[] = [
  { heading: "发展背景", body: "伴随消费升级与整装需求兴起，整木概念由定制木作逐步发展为系统化解决方案。" },
  { heading: "核心特征", body: "强调一体化、可定制、风格统一，覆盖设计、选材、制造与安装。" },
  { heading: "技术结构", body: "由门、墙板、柜体、线条、装饰件等模块协同组合，兼顾工艺与交付效率。" },
  { heading: "行业意义", body: "推动木作产业从单品竞争转向系统能力竞争，提升高端定制与品牌化水平。" },
];

const COVER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function createDefaultTermSections(): TermSection[] {
  return DEFAULT_TERM_SECTIONS.map((x, i) => ({ id: `default-${i + 1}`, heading: x.heading, body: x.body }));
}

function buildTermContentHtml(sections: TermSection[]) {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  return sections
    .map((s) => {
      const h = escapeHtml(s.heading.trim());
      const p = escapeHtml(s.body.trim()).replace(/\n/g, "<br />");
      if (!h && !p) return "";
      return `<section><h3>${h || "未命名小标题"}</h3><p>${p || "暂无说明"}</p></section>`;
    })
    .filter(Boolean)
    .join("");
}

function extractTermBody(node: Element | null) {
  if (!node) return "";
  const html = node.innerHTML.replace(/<br\s*\/?>/gi, "\n");
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").trim();
}

function parseTermContentSections(html: string): TermSection[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const blocks = Array.from(doc.querySelectorAll("section"));
    const fromSections = blocks
      .map((node, idx) => {
        const heading = (node.querySelector("h1,h2,h3,h4,h5,h6")?.textContent || "").trim();
        const body = extractTermBody(node.querySelector("p")) || (node.textContent || "").trim();
        return { id: `parsed-${idx + 1}`, heading, body };
      })
      .filter((x) => x.heading || x.body);
    if (fromSections.length > 0) return fromSections;
  } catch {}
  return createDefaultTermSections();
}

function getAllowedCategories(memberType: MemberType): CategoryOption[] {
  if (memberType === "personal") {
    return MEMBER_PUBLISH_CATEGORY_OPTIONS.filter(
      (x) => x.href === "/dictionary" || x.href === "/standards"
    );
  }
  return MEMBER_PUBLISH_CATEGORY_OPTIONS;
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
  slug: string | null,
  fallbackTitle: string | null
) {
  const segment = (slug || fallbackTitle || "").trim();
  if (!segment) return null;
  const encoded = encodeURIComponent(segment);
  const tab = resolveTabKeyFromHref(categoryHref, subHref);
  if (tab === "brands") return `/brands/${encoded}`;
  if (tab === "terms") return `/dictionary/${encoded}`;
  if (tab === "standards") return `/standards/${encoded}`;
  if (tab === "awards") return `/awards/${encoded}`;
  return `/news/${encoded}`;
}

function buildAutoExcerpt(text: string) {
  return previewText(text, 120);
}

function PublishCenterPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [memberType, setMemberType] = useState<MemberType>("personal");
  const [items, setItems] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<HTMLElement | null>(null);
  const publishCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const editCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const publishObjectUrlRef = useRef<string | null>(null);
  const editObjectUrlRef = useRef<string | null>(null);
  const suppressMessageScrollRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<SubmitPreview | null>(null);
  const [pendingPreviewScroll, setPendingPreviewScroll] = useState<"publish" | "edit" | null>(null);
  const [cropTarget, setCropTarget] = useState<"publish" | "edit" | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [termSections, setTermSections] = useState<TermSection[]>(createDefaultTermSections());
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTermSections, setEditTermSections] = useState<TermSection[]>(createDefaultTermSections());
  const [editBrandStructured, setEditBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [editStandardStructured, setEditStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [editDataStructured, setEditDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [editAwardStructured, setEditAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editCoverPreviewSrc, setEditCoverPreviewSrc] = useState("");
  const [editReason, setEditReason] = useState("");

  const allowedCategories = useMemo(() => getAllowedCategories(memberType), [memberType]);
  const allowedTabs = useMemo(() => allowedCategories.map((x) => tabFromHref(x.href)), [allowedCategories]);
  const safeTab = useMemo(() => (allowedTabs.includes(tab) ? tab : allowedTabs[0] ?? "articles"), [tab, allowedTabs]);
  const selectedTabDef = useMemo(() => CONTENT_TAB_DEFS.find((x) => x.key === safeTab) ?? CONTENT_TAB_DEFS[0], [safeTab]);
  const selectedCategory = useMemo(
    () => allowedCategories.find((x) => x.href === selectedTabDef.href) ?? allowedCategories[0],
    [allowedCategories, selectedTabDef.href]
  );
  const subOptions = useMemo(() => selectedCategory?.subs ?? [], [selectedCategory]);

  const filteredItems = useMemo(
    () => items.filter((item) => resolveTabKeyFromHref(item.categoryHref, item.subHref) === safeTab),
    [items, safeTab]
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

    const listRes = await fetch("/api/member/articles?limit=100", { credentials: "include", cache: "no-store" });
    if (listRes.ok) {
      const data = await listRes.json();
      setItems(Array.isArray(data.items) ? data.items : []);
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
    if (subOptions.length > 0 && !subOptions.some((s) => s.href === subHref)) {
      setSubHref(subOptions[0].href);
    }
  }, [subOptions, subHref]);

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
      safeTab === "terms"
        ? termSections.map((x) => `${x.heading} ${x.body}`).join(" ")
        : safeTab === "brands"
          ? brandStructuredToSearchText(brandStructured)
          : safeTab === "standards"
            ? standardStructuredToSearchText(standardStructured)
            : safeTab === "industry-data"
              ? dataStructuredToSearchText(dataStructured)
              : safeTab === "awards"
                ? awardStructuredToSearchText(awardStructured)
                : content
    ).trim();
  }

  function getEditSourceText() {
    return (
      safeTab === "terms"
        ? editTermSections.map((x) => `${x.heading} ${x.body}`).join(" ")
        : safeTab === "brands"
          ? brandStructuredToSearchText(editBrandStructured)
          : safeTab === "standards"
            ? standardStructuredToSearchText(editStandardStructured)
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
    setMessage("已根据标题与正文提炼摘要，结果更利于搜索抓取与页面概览。");
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
    setMessage("已根据标题与正文提炼摘要，结果更利于搜索抓取与页面概览。");
  }

  const resetCategoryMeta = useCallback(() => {
    setCoverImage("");
    replacePreviewUrl("publish", "");
    setConceptSummary("");
    setApplicableScenarios("");
    setVersionLabel("");
    setRelatedTermSlugs("");
    setRelatedStandardIds("");
    setRelatedBrandIds("");
    setTagSlugs("");
  }, []);

  function resetTermSections() {
    setTermSections(createDefaultTermSections());
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

  function updateTermSection(id: string, patch: Partial<Omit<TermSection, "id">>) {
    setTermSections((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addTermSection() {
    setTermSections((prev) => [...prev, { id: `section-${Date.now()}`, heading: "", body: "" }]);
  }

  function removeTermSection(id: string) {
    setTermSections((prev) => prev.filter((x) => x.id !== id));
  }

  function updateEditTermSection(id: string, patch: Partial<Omit<TermSection, "id">>) {
    setEditTermSections((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addEditTermSection() {
    setEditTermSections((prev) => [...prev, { id: `edit-section-${Date.now()}`, heading: "", body: "" }]);
  }

  function removeEditTermSection(id: string) {
    setEditTermSections((prev) => prev.filter((x) => x.id !== id));
  }

  function replacePreviewUrl(kind: "publish" | "edit", nextUrl: string) {
    const targetRef = kind === "publish" ? publishObjectUrlRef : editObjectUrlRef;
    const setPreview = kind === "publish" ? setCoverPreviewSrc : setEditCoverPreviewSrc;
    if (targetRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(targetRef.current);
    }
    targetRef.current = nextUrl.startsWith("blob:") ? nextUrl : null;
    setPreview(nextUrl);
  }

  function queuePreviewScroll(target: "publish" | "edit") {
    setPendingPreviewScroll(target);
  }

  useEffect(() => {
    resetCategoryMeta();
  }, [safeTab, resetCategoryMeta]);

  useEffect(() => {
    if (safeTab === "terms") resetTermSections();
    if (safeTab === "brands") resetBrandStructured();
    if (safeTab === "standards") resetStandardStructured();
    if (safeTab === "industry-data") resetDataStructured();
    if (safeTab === "awards") resetAwardStructured();
  }, [safeTab]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading || !selectedCategory) return;
    setLoading(true);
    setMessage("");
    setLastSubmitted(null);

    const composedContent =
      safeTab === "terms"
        ? buildTermContentHtml(termSections)
        : safeTab === "brands"
          ? buildBrandStructuredHtml(brandStructured)
          : safeTab === "standards"
            ? buildStandardStructuredHtml(standardStructured)
            : safeTab === "industry-data"
              ? buildDataStructuredHtml(dataStructured)
              : safeTab === "awards"
                ? buildAwardStructuredHtml(awardStructured)
        : content.trim();

    const payload = {
      title: title.trim(),
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
      typeof data?.slug === "string" ? data.slug : null,
      submittedTitle
    );
    setLastSubmitted({ title: submittedTitle, href: previewHref, status: submittedStatus });
    setMessage(nextStatus === "approved" ? "提交成功，内容已发布。" : "提交成功，已进入审核流程。");
    setTitle("");
    setExcerpt("");
    setContent("");
    resetTermSections();
    resetBrandStructured();
    resetStandardStructured();
    resetDataStructured();
    resetAwardStructured();
    resetCategoryMeta();
    setIsPinned(false);
    await load();
    setLoading(false);
  }

  function openEditRequest(item: Row) {
    setEditingId(item.id);
    setEditTitle(item.title ?? "");
    setEditExcerpt(item.excerpt ?? "");
    setEditContent(item.content ?? "");
    setEditTermSections(safeTab === "terms" ? parseTermContentSections(item.content ?? "") : createDefaultTermSections());
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
  }

  async function submitEditRequest(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const composedEditContent =
      safeTab === "terms"
        ? buildTermContentHtml(editTermSections)
        : safeTab === "brands"
          ? buildBrandStructuredHtml(editBrandStructured)
          : safeTab === "standards"
            ? buildStandardStructuredHtml(editStandardStructured)
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
      setMessage("未识别到明显关键词，请手动补充。");
      return;
    }
    setTagSlugs(tags.join(","));
    suppressMessageScrollRef.current = true;
    setMessage(`已按标题、摘要、正文和栏目语义生成 ${tags.length} 个关键词。`);
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
          <>
            <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
              <p className="text-xs text-muted">词库结构化录入：词语（标题）+ 摘要 + 多个小标题解释。</p>
              {termSections.map((sec, idx) => (
                <div key={sec.id} className="rounded-md border border-border bg-surface-elevated p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">小节 {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeTermSection(sec.id)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-surface"
                      disabled={termSections.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                  <input
                    className="w-full border border-border rounded px-3 py-2 bg-surface"
                    placeholder="小标题，如：发展背景"
                    value={sec.heading}
                    onChange={(e) => updateTermSection(sec.id, { heading: e.target.value })}
                  />
                  <textarea
                    className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[90px]"
                    placeholder="该小标题下的解释内容"
                    value={sec.body}
                    onChange={(e) => updateTermSection(sec.id, { body: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={addTermSection} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
                  添加小标题
                </button>
                <button type="button" onClick={resetTermSections} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
                  恢复默认模板
                </button>
              </div>
            </div>
          </>
        )}

        {currentTab === "standards" && (
          <div className="space-y-2">
            <label className="block text-sm text-muted">标准结构化内容</label>
            <StandardStructuredEditor value={standardStructured} onChange={setStandardStructured} />
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
              placeholder="如：行业趋势,技术发展,品牌建设"
            />
            <button type="button" onClick={autoFillTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">
              自动生成
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
        <Link href="/membership/login" className="text-sm text-accent hover:underline">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">内容发布中心</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-2">内容发布中心</h1>
      <p className="text-sm text-muted mb-2">
        当前身份：{role === "SUPER_ADMIN" ? "主管理员" : role === "ADMIN" ? "子管理员" : "会员"} /{" "}
        {memberType === "enterprise_advanced" ? "企业高级会员" : memberType === "enterprise_basic" ? "企业基础会员" : "个人会员"}
      </p>
      <p className="text-sm text-muted mb-6">左侧按七大类分别发布，不同类别显示不同组成字段。</p>
      <div className="mb-6">
        <Link href="/membership/content/verification" className="text-sm text-accent hover:underline">
          去提交企业认证资料
        </Link>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-4 mb-8">
        <aside className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">发布栏目</p>
          <ul className="space-y-1">
            {allowedCategories.map((cat) => {
              const catTab = tabFromHref(cat.href);
              const active = catTab === safeTab;
              return (
                <li key={cat.href}>
                  <Link
                    href={`/membership/content/publish?tab=${catTab}`}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-accent/15 text-accent" : "text-primary hover:bg-surface hover:text-accent"
                    }`}
                  >
                    {cat.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted">当前：{selectedTabDef.label}</div>
        </aside>

        <form onSubmit={submit} className="rounded-xl border border-border bg-surface-elevated p-5 space-y-3">
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
                  return (
                    <button
                      key={s.href}
                      type="button"
                      onClick={() => setSubHref(s.href)}
                      className={`px-3 py-1.5 rounded-md text-sm transition ${active ? "bg-accent text-white" : "bg-surface-elevated text-primary border border-border hover:bg-surface"}`}
                    >
                      {s.label}
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

          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm text-muted">{safeTab === "standards" ? "标准摘要" : "摘要"}</label>
            <button type="button" onClick={autoFillExcerpt} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-surface">自动生成摘要</button>
          </div>
          <textarea
            className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />

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
                  <img src={coverPreviewSrc || coverImage} alt="" className="max-h-80 w-full rounded-lg border border-border bg-surface-elevated object-contain" loading="lazy" />
                </div>
              )}
            </>
          )}

          {(role === "SUPER_ADMIN" || role === "ADMIN") && (
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="text-primary">置顶内容（全站优先显示）</span>
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
            </label>
          )}

          {safeTab !== "terms" &&
            safeTab !== "brands" &&
            safeTab !== "standards" &&
            safeTab !== "industry-data" &&
            safeTab !== "awards" && (
            <>
              <label className="block text-sm text-muted">正文</label>
              <RichEditor value={content} onChange={setContent} minHeight={280} placeholder="" />
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

      <section className="rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="text-sm font-medium text-primary mb-3">我的投稿记录（{selectedTabDef.label}）</h2>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted">当前栏目暂无投稿记录。</p>
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li key={item.id} className="border-b border-border pb-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate text-primary">{item.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.isPinned && (
                      <span className="text-[11px] rounded-full border border-accent/40 px-2 py-0.5 text-accent">置顶</span>
                    )}
                    <span className="text-xs text-muted">{STATUS_TEXT[item.status]}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <button type="button" onClick={() => openEditRequest(item)} className="text-xs px-2 py-1 rounded border border-border hover:bg-surface">
                    提交修改申请
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                    <img src={editCoverPreviewSrc || editCoverImage} alt="" className="max-h-80 w-full rounded-lg border border-border bg-surface-elevated object-contain" loading="lazy" />
                  </div>
                )}
              </>
            )}
            {safeTab === "terms" ? (
              <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
                <p className="text-xs text-muted">词库条目修改（小标题 + 解释）。</p>
                {editTermSections.map((sec, idx) => (
                  <div key={sec.id} className="rounded-md border border-border bg-surface-elevated p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted">小节 {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeEditTermSection(sec.id)}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-surface"
                        disabled={editTermSections.length <= 1}
                      >
                        删除
                      </button>
                    </div>
                    <input
                      className="w-full border border-border rounded px-3 py-2 bg-surface"
                      placeholder="小标题"
                      value={sec.heading}
                      onChange={(e) => updateEditTermSection(sec.id, { heading: e.target.value })}
                    />
                    <textarea
                      className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[90px]"
                      placeholder="解释内容"
                      value={sec.body}
                      onChange={(e) => updateEditTermSection(sec.id, { body: e.target.value })}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button type="button" onClick={addEditTermSection} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
                    添加小标题
                  </button>
                  <button type="button" onClick={() => setEditTermSections(createDefaultTermSections())} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
                    恢复默认模板
                  </button>
                </div>
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
                <RichEditor value={editContent} onChange={setEditContent} minHeight={260} placeholder="" />
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
          source={cropTarget === "publish" ? coverImage : editCoverImage}
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
