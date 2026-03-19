"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONTENT_TAB_DEFS, MEMBER_PUBLISH_CATEGORY_OPTIONS, resolveTabKeyFromHref, type ContentTabKey } from "@/lib/content-taxonomy";
import { ManageContentList } from "@/app/membership/admin/content/components/ManageContentList";
import { ReviewPanels } from "@/app/membership/admin/content/components/ReviewPanels";
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

type Status = "draft" | "pending" | "approved" | "rejected";
type Mode = "publish" | "manage" | "review";
type TermSection = { id: string; heading: string; body: string };
type SubmitPreview = { title: string; href: string | null; status: Status };

type SessionInfo = {
  role: string | null;
  canDeleteOwnContent: boolean;
  canDeleteMemberContent: boolean;
  canDeleteAllContent: boolean;
  canEditOwnContent: boolean;
  canEditMemberContent: boolean;
  canEditAllContent: boolean;
};

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  source?: string | null;
  sourceUrl?: string | null;
  displayAuthor?: string | null;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  subHref?: string | null;
  categoryHref?: string | null;
  tagSlugs?: string | null;
  faqJson?: string | null;
  isPinned?: boolean;
  publishedAt?: string | null;
  status: Status;
  previewHref?: string | null;
  authorMember?: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  } | null;
};

type ChangeRequestItem = {
  id: string;
  reason: string | null;
  diffSummary: string | null;
  patchTitle?: string | null;
  patchExcerpt?: string | null;
  patchContent?: string | null;
  patchCoverImage?: string | null;
  patchTagSlugs?: string | null;
  patchSubHref?: string | null;
  article: {
    id: string;
    title: string;
    source?: string | null;
    sourceUrl?: string | null;
    displayAuthor?: string | null;
    excerpt?: string | null;
    content?: string | null;
    coverImage?: string | null;
    tagSlugs?: string | null;
    subHref?: string | null;
    isPinned?: boolean;
  };
  submitter: { name: string | null; email: string; role: string | null };
};

const COVER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const BRAND_REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;

const STATUS_TEXT: Record<Status, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已发布",
  rejected: "已驳回",
};

const DEFAULT_TERM_SECTIONS: Omit<TermSection, "id">[] = [
  { heading: "发展背景", body: "伴随消费升级与整装需求兴起，整木概念由定制木作逐步发展为系统化解决方案。" },
  { heading: "核心特征", body: "强调一体化、可定制、风格统一，覆盖设计、选材、制造与安装。" },
  { heading: "技术结构", body: "由门、墙板、柜体、线条、装饰件等模块协同组合，兼顾工艺与交付效率。" },
  { heading: "行业意义", body: "推动木作产业从单品竞争转向系统能力竞争，提升高端定制与品牌化水平。" },
];

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

function parseMode(raw: string | null): Mode {
  return raw === "manage" || raw === "review" || raw === "publish" ? raw : "publish";
}

function parseTab(raw: string | null): ContentTabKey {
  const hit = CONTENT_TAB_DEFS.find((x) => x.key === raw);
  return hit?.key ?? "articles";
}

function submitterLabel(user?: { name: string | null; email: string; role: string | null } | null) {
  if (!user) return "未知账号";
  const roleLabel =
    user.role === "SUPER_ADMIN" ? "主管理员" : user.role === "ADMIN" ? "子管理员" : "会员";
  return `${user.name?.trim() || user.email}（${roleLabel}）`;
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

export default function AdminContentPage() {
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const tab = parseTab(searchParams.get("tab"));

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<HTMLElement | null>(null);
  const publishCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const editCoverPreviewRef = useRef<HTMLDivElement | null>(null);
  const publishObjectUrlRef = useRef<string | null>(null);
  const editObjectUrlRef = useRef<string | null>(null);
  const suppressMessageScrollRef = useRef(false);
  const [lastSubmitted, setLastSubmitted] = useState<SubmitPreview | null>(null);
  const [pendingPreviewScroll, setPendingPreviewScroll] = useState<"publish" | "edit" | null>(null);
  const [cropTarget, setCropTarget] = useState<"publish" | "edit" | null>(null);

  const [items, setItems] = useState<ArticleItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ArticleItem[]>([]);
  const [pendingChanges, setPendingChanges] = useState<ChangeRequestItem[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [source, setSource] = useState("");
  const [displayAuthor, setDisplayAuthor] = useState("");
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
  const [tagSlugs, setTagSlugs] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [documentMeta, setDocumentMeta] = useState<DocumentMetadata>(createEmptyDocumentMetadata());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editDisplayAuthor, setEditDisplayAuthor] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTermSections, setEditTermSections] = useState<TermSection[]>(createDefaultTermSections());
  const [editBrandStructured, setEditBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [editStandardStructured, setEditStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [editDataStructured, setEditDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [editAwardStructured, setEditAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editCoverPreviewSrc, setEditCoverPreviewSrc] = useState("");
  const [editTagSlugs, setEditTagSlugs] = useState("");
  const [editSubHref, setEditSubHref] = useState("");
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editDocumentMeta, setEditDocumentMeta] = useState<DocumentMetadata>(createEmptyDocumentMetadata());
  const [reviewAction, setReviewAction] = useState<Status | null>(null);


  const selectedTabDef = useMemo(() => CONTENT_TAB_DEFS.find((x) => x.key === tab) ?? CONTENT_TAB_DEFS[0], [tab]);
  const selectedCategory = useMemo(() => MEMBER_PUBLISH_CATEGORY_OPTIONS.find((x) => x.href === selectedTabDef.href) ?? MEMBER_PUBLISH_CATEGORY_OPTIONS[0], [selectedTabDef.href]);
  const subOptions = selectedCategory.subs;
  const isSuperAdmin = session?.role === "SUPER_ADMIN";
  const canReview = session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";

  const canEdit = !!(session && (isSuperAdmin || session.canEditAllContent || session.canEditMemberContent || session.canEditOwnContent));
  const canDelete = !!(session && (isSuperAdmin || session.canDeleteAllContent || session.canDeleteMemberContent || session.canDeleteOwnContent));

  useEffect(() => {
    if (tab === "brands") return;
    if (!subHref && subOptions[0]) setSubHref(subOptions[0].href);
  }, [tab, subHref, subOptions]);

  useEffect(() => {
    if (tab === "terms") setTermSections(createDefaultTermSections());
    if (tab === "brands") setBrandStructured(createDefaultBrandStructuredData());
    if (tab === "standards") setStandardStructured(createDefaultStandardStructuredData());
    if (tab === "industry-data") setDataStructured(createDefaultDataStructuredData());
    if (tab === "awards") setAwardStructured(createDefaultAwardStructuredData());
    setCoverImage("");
    replacePreviewUrl("publish", "");
    setIsPinned(false);
    setSlug("");
    setSource("");
    setDisplayAuthor("");
    setDocumentMeta(createEmptyDocumentMetadata());
  }, [tab]);

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

  async function uploadPublishCover(file: File | null) {
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

  async function uploadEditCover(file: File | null) {
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
      setMessage("顶部配图已加载，可先预览，保存后生效。");
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

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    if (!res.ok) { setLoading(false); return; }
    const me = await res.json();
    setSession({
      role: me.role ?? null,
      canDeleteOwnContent: me.canDeleteOwnContent === true,
      canDeleteMemberContent: me.canDeleteMemberContent === true,
      canDeleteAllContent: me.canDeleteAllContent === true,
      canEditOwnContent: me.canEditOwnContent === true,
      canEditMemberContent: me.canEditMemberContent === true,
      canEditAllContent: me.canEditAllContent === true,
    });
    setLoading(false);
  }, []);

  const loadList = useCallback(async () => {
    const sp = new URLSearchParams({ limit: "100", categoryHref: selectedCategory.href });
    const res = await fetch(`/api/admin/articles?${sp.toString()}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setItems(Array.isArray(data.items) ? data.items : []);
  }, [selectedCategory.href]);

  const loadReview = useCallback(async () => {
    const sp = new URLSearchParams({ status: "pending", limit: "200", categoryHref: selectedCategory.href });
    const [a, c] = await Promise.all([
      fetch(`/api/admin/articles?${sp.toString()}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/admin/article-change-requests?${sp.toString()}`, { credentials: "include", cache: "no-store" }),
    ]);
    const ad = await a.json().catch(() => ({}));
    const cd = await c.json().catch(() => ({}));
    setPendingItems(Array.isArray(ad.items) ? ad.items : []);
    setPendingChanges(Array.isArray(cd.items) ? cd.items : []);
  }, [selectedCategory.href]);

  useEffect(() => { void loadSession(); }, [loadSession]);
  useEffect(() => {
    if (!session) return;
    if (mode === "manage") void loadList();
    if (mode === "review" && canReview) void loadReview();
  }, [session, mode, canReview, loadList, loadReview]);

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

  const manageItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        previewHref: buildPreviewHref(item.categoryHref ?? null, item.subHref ?? null, item.id, item.slug ?? null, item.title),
      })),
    [items]
  );

  function getPublishSourceText() {
    return (
      tab === "brands"
          ? brandStructuredToSearchText(brandStructured)
          : tab === "terms" || tab === "standards"
            ? content
            : tab === "industry-data"
              ? dataStructuredToSearchText(dataStructured)
              : tab === "awards"
                ? awardStructuredToSearchText(awardStructured)
                : content
    ).trim();
  }

  function getEditSourceText() {
    return (
      tab === "brands"
          ? brandStructuredToSearchText(editBrandStructured)
          : tab === "terms" || tab === "standards"
            ? editContent
            : tab === "industry-data"
              ? dataStructuredToSearchText(editDataStructured)
              : tab === "awards"
                ? awardStructuredToSearchText(editAwardStructured)
                : editContent
    ).trim();
  }

  function autoFillPublishExcerpt() {
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

  async function submitPublish(e: FormEvent) {
    e.preventDefault();
    setLastSubmitted(null);
    const composedContent =
      tab === "brands"
          ? buildBrandStructuredHtml(brandStructured)
          : tab === "terms" || tab === "standards"
            ? content
            : tab === "industry-data"
              ? buildDataStructuredHtml(dataStructured)
              : tab === "awards"
                ? buildAwardStructuredHtml(awardStructured)
                : content;
    const res = await fetch("/api/admin/articles", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        slug: slug.trim() || null,
        source: source.trim() || null,
        displayAuthor: displayAuthor.trim() || null,
        excerpt: excerpt || null,
        content: composedContent,
        coverImage:
          tab === "brands"
            ? brandStructured.logoUrl.trim() || null
            : coverImage.trim() || null,
        applicableScenarios:
          tab === "standards"
            ? standardStructured.scope.trim() || null
            : tab === "industry-data"
              ? dataStructured.methodology.trim() || null
              : null,
        versionLabel:
          tab === "standards"
            ? standardStructured.versionNote.trim() || null
            : tab === "awards"
              ? (awardStructured.year ? `${awardStructured.year}版` : null)
              : null,
        categoryHref: selectedCategory.href,
        subHref: tab === "brands" ? null : subHref,
        tagSlugs: tagSlugs || null,
        faqJson: tab === "terms" || tab === "standards" ? stringifyDocumentMetadata(documentMeta) : null,
        syncToMainSite: true,
        isPinned,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data.error ?? "发布失败"); return; }
    const submittedTitle = typeof data?.title === "string" ? data.title : title.trim();
    const submittedStatus = (typeof data?.status === "string" ? data.status : "approved") as Status;
    const previewHref = buildPreviewHref(
      typeof data?.categoryHref === "string" ? data.categoryHref : selectedCategory.href,
      typeof data?.subHref === "string" ? data.subHref : subHref,
      typeof data?.id === "string" ? data.id : null,
      typeof data?.slug === "string" ? data.slug : null,
      submittedTitle
    );
    setLastSubmitted({ title: submittedTitle, href: previewHref, status: submittedStatus });
    setMessage("提交成功。");
    setTitle("");
    setSlug("");
    setSource("");
    setDisplayAuthor("");
    setExcerpt("");
    setContent("");
    setCoverImage("");
    setTagSlugs("");
    setIsPinned(false);
    setDocumentMeta(createEmptyDocumentMetadata());
    setTermSections(createDefaultTermSections());
    setBrandStructured(createDefaultBrandStructuredData());
    setStandardStructured(createDefaultStandardStructuredData());
    setDataStructured(createDefaultDataStructuredData());
    setAwardStructured(createDefaultAwardStructuredData());
  }

  function openEdit(item: ArticleItem) {
    setEditingId(item.id);
    setEditingChangeId(null);
    setEditSlug(item.slug ?? "");
    setEditTitle(item.title);
    setEditSource(item.source ?? "");
    setEditDisplayAuthor(item.displayAuthor ?? "");
    setEditExcerpt(item.excerpt ?? "");
    setEditContent(item.content);
    setEditTermSections(tab === "terms" ? parseTermContentSections(item.content) : createDefaultTermSections());
    setEditBrandStructured(
      tab === "brands"
        ? parseBrandStructuredHtml(item.content) ?? createDefaultBrandStructuredData()
        : createDefaultBrandStructuredData()
    );
    setEditStandardStructured(
      tab === "standards"
        ? parseStandardStructuredHtml(item.content) ?? createDefaultStandardStructuredData()
        : createDefaultStandardStructuredData()
    );
    setEditDataStructured(
      tab === "industry-data"
        ? parseDataStructuredHtml(item.content) ?? createDefaultDataStructuredData()
        : createDefaultDataStructuredData()
    );
    setEditAwardStructured(
      tab === "awards"
        ? parseAwardStructuredHtml(item.content) ?? createDefaultAwardStructuredData()
        : createDefaultAwardStructuredData()
    );
    setEditCoverImage(item.coverImage ?? "");
    replacePreviewUrl("edit", item.coverImage ?? "");
    setEditTagSlugs(item.tagSlugs ?? "");
    setEditSubHref(item.subHref ?? subHref);
    setEditIsPinned(item.isPinned === true);
    setEditDocumentMeta(parseDocumentMetadata(item.faqJson));
  }

  function openEditFromChange(item: ChangeRequestItem) {
    const nextContent = item.patchContent ?? item.article.content ?? "";
    setEditingId(item.article.id);
    setEditingChangeId(item.id);
    setEditSlug("");
    setEditTitle(item.patchTitle ?? item.article.title);
    setEditSource(item.article.source ?? "");
    setEditDisplayAuthor(item.article.displayAuthor ?? "");
    setEditExcerpt(item.patchExcerpt ?? item.article.excerpt ?? "");
    setEditContent(nextContent);
    setEditTermSections(tab === "terms" ? parseTermContentSections(nextContent) : createDefaultTermSections());
    setEditBrandStructured(
      tab === "brands"
        ? parseBrandStructuredHtml(nextContent) ?? createDefaultBrandStructuredData()
        : createDefaultBrandStructuredData()
    );
    setEditStandardStructured(
      tab === "standards"
        ? parseStandardStructuredHtml(nextContent) ?? createDefaultStandardStructuredData()
        : createDefaultStandardStructuredData()
    );
    setEditDataStructured(
      tab === "industry-data"
        ? parseDataStructuredHtml(nextContent) ?? createDefaultDataStructuredData()
        : createDefaultDataStructuredData()
    );
    setEditAwardStructured(
      tab === "awards"
        ? parseAwardStructuredHtml(nextContent) ?? createDefaultAwardStructuredData()
        : createDefaultAwardStructuredData()
    );
    setEditCoverImage(item.patchCoverImage ?? item.article.coverImage ?? "");
    replacePreviewUrl("edit", item.patchCoverImage ?? item.article.coverImage ?? "");
    setEditTagSlugs(item.patchTagSlugs ?? item.article.tagSlugs ?? "");
    setEditSubHref(item.patchSubHref ?? item.article.subHref ?? subHref);
    setEditIsPinned(item.article.isPinned === true);
    setEditDocumentMeta(createEmptyDocumentMetadata());
  }

  async function saveEdit(nextStatus?: Status) {
    if (!editingId) return;
    setReviewAction(nextStatus ?? null);
    const composedEditContent =
      tab === "brands"
          ? buildBrandStructuredHtml(editBrandStructured)
          : tab === "terms" || tab === "standards"
            ? editContent
            : tab === "industry-data"
              ? buildDataStructuredHtml(editDataStructured)
              : tab === "awards"
                ? buildAwardStructuredHtml(editAwardStructured)
                : editContent;
    const res = await fetch(`/api/admin/articles/${editingId}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        slug: editSlug || undefined,
        source: editSource || null,
        displayAuthor: editDisplayAuthor || null,
        excerpt: editExcerpt || null,
        content: composedEditContent,
        coverImage:
          tab === "brands"
            ? editBrandStructured.logoUrl.trim() || null
            : editCoverImage.trim() || null,
        applicableScenarios:
          tab === "standards"
            ? editStandardStructured.scope.trim() || null
            : tab === "industry-data"
              ? editDataStructured.methodology.trim() || null
              : undefined,
        versionLabel:
          tab === "standards"
            ? editStandardStructured.versionNote.trim() || null
            : tab === "awards"
              ? (editAwardStructured.year ? `${editAwardStructured.year}版` : null)
              : undefined,
        subHref: tab === "brands" ? null : editSubHref || subHref,
        tagSlugs: editTagSlugs || null,
        faqJson: tab === "terms" || tab === "standards" ? stringifyDocumentMetadata(editDocumentMeta) : null,
        isPinned: editIsPinned,
        status: nextStatus,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data.error ?? "保存失败"); setReviewAction(null); return; }
    setItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...data } : item)));
    setPendingItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...data } : item)));
    setMessage(nextStatus ? "已修改并审核。" : "已保存修改。");
    setEditingId(null); setEditingChangeId(null); setReviewAction(null);
    if (mode === "review") await loadReview(); else await loadList();
  }

  async function removeItem(id: string) {
    if (!confirm("确认删除该内容？")) return;
    const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { setMessage("删除失败"); return; }
    setMessage("已删除。");
    await loadList();
  }

  async function reviewArticle(id: string, status: Status) {
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setMessage("审核失败");
      return;
    }
    setMessage(`已${status === "approved" ? "通过" : "驳回"}。`);
    await loadReview();
  }

  async function reviewChange(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/admin/article-change-requests/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) { setMessage("修改申请审核失败"); return; }
    await loadReview();
  }

  async function saveEditAndApproveChange() {
    if (!editingChangeId) return;
    const targetChangeId = editingChangeId;
    await saveEdit("approved");
    await reviewChange(targetChangeId, "approved");
    setEditingChangeId(null);
    setMessage("已调整内容并通过该修改申请。");
  }

  function autoFillPublishTags() {
    const tags = suggestTagsForGeo({
      title,
      excerpt,
      content: getPublishSourceText(),
      categoryHref: selectedCategory.href,
      subHref,
    });
    setTagSlugs(tags.join(","));
    suppressMessageScrollRef.current = true;
    setMessage(tags.length > 0 ? `已按标题、摘要、正文和栏目语义提取 ${tags.length} 个行业关键词。` : "未识别到明显行业关键词，请手动补充。");
  }

  function autoFillEditTags() {
    const tags = suggestTagsForGeo({
      title: editTitle,
      excerpt: editExcerpt,
      content: getEditSourceText(),
      categoryHref: selectedCategory.href,
      subHref,
    });
    setEditTagSlugs(tags.join(","));
    suppressMessageScrollRef.current = true;
    setMessage(tags.length > 0 ? `已按标题、摘要、正文和栏目语义提取 ${tags.length} 个行业关键词。` : "未识别到明显行业关键词，请手动补充。");
  }

  if (loading) return <p className="text-muted">加载中...</p>;
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) return <p className="text-muted">需要管理员权限。</p>;

  return (
    <div className="max-w-6xl space-y-6">
      <header className="rounded-xl border border-border bg-surface-elevated p-5">
        <h1 className="font-serif text-2xl font-bold text-primary">{mode === "publish" ? "内容发布" : mode === "manage" ? "内容管理" : "审核中心"} · {selectedTabDef.label}</h1>
        {message && (
          <div ref={messageRef} className="mt-2 scroll-mt-24 space-y-1">
            <p className="text-sm text-accent">{message}</p>
            {lastSubmitted && (
              <div className="text-xs text-muted">
                {lastSubmitted.status === "approved" && lastSubmitted.href ? (
                  <>
                    点击标题预览：
                    <a href={lastSubmitted.href} target="_blank" rel="noreferrer" className="ml-1 text-accent hover:underline">
                      {lastSubmitted.title}
                    </a>
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
      </header>

      {mode === "publish" && (
        <section className="rounded-xl border border-border bg-surface-elevated p-5">
          <form onSubmit={submitPublish} className="space-y-3">
            {tab !== "brands" && (
              <>
                <label className="block text-sm text-muted">子栏目</label>
                <div className="flex flex-wrap gap-2">{subOptions.map((s) => <button key={s.href} type="button" onClick={() => setSubHref(s.href)} className={`px-3 py-1 rounded border ${subHref === s.href ? "bg-accent text-white border-accent" : "border-border"}`}>{s.label}</button>)}</div>
              </>
            )}
            {tab === "brands" && (
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
            <label className="block text-sm text-muted">标题</label><input className="w-full border border-border rounded px-3 py-2 bg-surface" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
              <div className={`rounded-2xl border px-4 py-3 transition md:min-w-[168px] ${isPinned ? "border-[rgba(180,154,107,0.54)] bg-[linear-gradient(180deg,rgba(202,174,121,0.2),rgba(180,154,107,0.14))] shadow-[0_18px_34px_-24px_rgba(180,154,107,0.6)]" : "border-[rgba(180,154,107,0.28)] bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(247,240,229,0.92))] shadow-[0_14px_28px_-24px_rgba(180,154,107,0.34)]"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#7f6947]">置顶</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinned((value) => !value)}
                    className={`inline-flex min-w-[86px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isPinned
                        ? "border-[rgba(180,154,107,0.6)] bg-[#b49a6b] text-white shadow-[0_10px_24px_-18px_rgba(180,154,107,0.8)]"
                        : "border-[rgba(180,154,107,0.38)] bg-white/90 text-[#8a734d] hover:border-[rgba(180,154,107,0.55)] hover:bg-white"
                    }`}
                  >
                    {isPinned ? "已置顶" : "设为置顶"}
                  </button>
                </div>
              </div>
            </div>
            {(tab === "terms" || tab === "standards") && (
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
              <label className="block text-sm text-muted">{tab === "standards" ? "标准摘要" : "摘要"}</label>
              <button type="button" onClick={autoFillPublishExcerpt} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-surface">自动生成摘要</button>
            </div>
            <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            {(tab === "terms" || tab === "standards") && (
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <p className="text-sm font-medium text-primary">文档信息</p>
                <textarea
                  className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[88px]"
                  value={documentMeta.intro}
                  onChange={(e) => setDocumentMeta((prev) => ({ ...prev, intro: e.target.value }))}
                  placeholder={tab === "terms" ? "词条简介，用一段话说明术语定义与适用语境。" : "标准简介，用一段话说明标准适用范围和核心价值。"}
                />
                {tab === "standards" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.standardCode} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, standardCode: e.target.value }))} placeholder="标准编号" />
                    <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.versions[0]?.version ?? ""} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, versions: [{ version: e.target.value, updatedAt: prev.versions[0]?.updatedAt, note: prev.versions[0]?.note }, ...prev.versions.slice(1)] }))} placeholder="当前版本，如 V1.0" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px] md:col-span-2" value={documentMeta.scope} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, scope: e.target.value }))} placeholder="适用范围" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.materialRequirements} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, materialRequirements: e.target.value }))} placeholder="材料要求" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.processRequirements} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, processRequirements: e.target.value }))} placeholder="工艺要求" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.executionFlow} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, executionFlow: e.target.value }))} placeholder="执行流程" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={documentMeta.acceptanceCriteria} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} placeholder="验收标准" />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoTitle} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoTitle: e.target.value }))} placeholder="SEO 标题" />
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoKeywords} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoKeywords: e.target.value }))} placeholder="SEO 关键词，逗号分隔" />
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={documentMeta.seoDescription} onChange={(e) => setDocumentMeta((prev) => ({ ...prev, seoDescription: e.target.value }))} placeholder="SEO 描述" />
                </div>
                {tab === "standards" && (
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
            {tab !== "brands" && (
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
                      void uploadPublishCover(e.target.files?.[0] ?? null);
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
                {tab === "terms" && <p className="text-xs text-muted">最佳尺寸：1600 x 900 px，建议使用横版 16:9 图片。</p>}
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
            {(tab === "terms" || tab === "standards") && (
              <>
                <label className="block text-sm text-muted">{tab === "terms" ? "词条正文" : "标准正文"}</label>
                <RichEditor
                  value={content}
                  onChange={setContent}
                  minHeight={360}
                  placeholder={tab === "terms" ? "支持标题、列表、表格、引用、图片的词条正文编辑。" : "支持标题分级、表格、图片和条款结构的标准正文编辑。"}
                />
              </>
            )}
            <label className="block text-sm text-muted">关键词（逗号分隔）</label>
            <div className="flex gap-2">
              <input className="flex-1 border border-border rounded px-3 py-2 bg-surface" value={tagSlugs} onChange={(e) => setTagSlugs(e.target.value)} placeholder="如：整木定制,门墙柜一体,渠道招商" />
              <button type="button" onClick={autoFillPublishTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">行业提取</button>
            </div>
            {tab !== "terms" && tab !== "brands" && tab !== "standards" && tab !== "industry-data" && tab !== "awards" && (
              <>
                <label className="block text-sm text-muted">正文</label>
                <RichEditor value={content} onChange={setContent} minHeight={300} placeholder="" />
              </>
            )}
            {tab === "brands" && (
              <>
                <label className="block text-sm text-muted">品牌结构化内容</label>
                <BrandStructuredEditor value={brandStructured} onChange={setBrandStructured} />
              </>
            )}
            {tab === "industry-data" && (
              <>
                <label className="block text-sm text-muted">数据结构化内容</label>
                <DataStructuredEditor value={dataStructured} onChange={setDataStructured} />
              </>
            )}
            {tab === "awards" && (
              <>
                <label className="block text-sm text-muted">评选结构化内容</label>
                <AwardStructuredEditor value={awardStructured} onChange={setAwardStructured} />
              </>
            )}
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">提交</button>
          </form>
        </section>
      )}

      {mode === "manage" && (
        <ManageContentList
          items={manageItems}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEdit}
          onDelete={(id) => void removeItem(id)}
        />
      )}

      {mode === "review" && (
        <ReviewPanels
          tab={tab}
          pendingItems={pendingItems}
          pendingChanges={pendingChanges}
          parseStandardStructuredHtml={parseStandardStructuredHtml}
          onEditArticle={openEdit}
          onReviewArticle={(id, status) => void reviewArticle(id, status)}
          onEditChange={openEditFromChange}
          onReviewChange={(id, status) => void reviewChange(id, status)}
        />
      )}

      {editingId && (
        <section ref={editFormRef} className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="text-sm font-semibold mb-3">编辑内容</h2>
          <form onSubmit={(e) => { e.preventDefault(); void saveEdit(); }} className="space-y-3">
            <label className="block text-sm text-muted">标题</label><input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <label className="mb-2 block text-sm font-medium text-primary">作者</label>
                <input
                  className="w-full border-0 bg-transparent px-0 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none"
                  value={editDisplayAuthor}
                  onChange={(e) => setEditDisplayAuthor(e.target.value)}
                  placeholder="如：编辑部 / 张三"
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <label className="mb-2 block text-sm font-medium text-primary">来源</label>
                <input
                  className="w-full border-0 bg-transparent px-0 py-0 text-[15px] text-primary placeholder:text-muted focus:outline-none"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  placeholder="如：整木网 / 品牌官方"
                />
              </div>
              <div className={`rounded-2xl border px-4 py-3 transition md:min-w-[168px] ${editIsPinned ? "border-[rgba(180,154,107,0.54)] bg-[linear-gradient(180deg,rgba(202,174,121,0.2),rgba(180,154,107,0.14))] shadow-[0_18px_34px_-24px_rgba(180,154,107,0.6)]" : "border-[rgba(180,154,107,0.28)] bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(247,240,229,0.92))] shadow-[0_14px_28px_-24px_rgba(180,154,107,0.34)]"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#7f6947]">置顶</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsPinned((value) => !value)}
                    className={`inline-flex min-w-[86px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      editIsPinned
                        ? "border-[rgba(180,154,107,0.6)] bg-[#b49a6b] text-white shadow-[0_10px_24px_-18px_rgba(180,154,107,0.8)]"
                        : "border-[rgba(180,154,107,0.38)] bg-white/90 text-[#8a734d] hover:border-[rgba(180,154,107,0.55)] hover:bg-white"
                    }`}
                  >
                    {editIsPinned ? "已置顶" : "设为置顶"}
                  </button>
                </div>
              </div>
            </div>
            {(tab === "terms" || tab === "standards") && (
              <>
                <label className="block text-sm text-muted">文档 Slug</label>
                <input
                  className="w-full border border-border rounded px-3 py-2 bg-surface"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  placeholder="留空则保持当前 slug"
                />
              </>
            )}
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm text-muted">{tab === "standards" ? "标准摘要" : "摘要"}</label>
              <button type="button" onClick={autoFillEditExcerpt} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-surface">自动生成摘要</button>
            </div>
            <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y" value={editExcerpt} onChange={(e) => setEditExcerpt(e.target.value)} />
            {(tab === "terms" || tab === "standards") && (
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <p className="text-sm font-medium text-primary">文档信息</p>
                <textarea
                  className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[88px]"
                  value={editDocumentMeta.intro}
                  onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, intro: e.target.value }))}
                  placeholder={tab === "terms" ? "词条简介，用一段话说明术语定义与适用语境。" : "标准简介，用一段话说明标准适用范围和核心价值。"}
                />
                {tab === "standards" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editDocumentMeta.standardCode} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, standardCode: e.target.value }))} placeholder="标准编号" />
                    <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editDocumentMeta.scope} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, scope: e.target.value }))} placeholder="适用范围" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={editDocumentMeta.materialRequirements} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, materialRequirements: e.target.value }))} placeholder="材料要求" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={editDocumentMeta.processRequirements} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, processRequirements: e.target.value }))} placeholder="工艺要求" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={editDocumentMeta.executionFlow} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, executionFlow: e.target.value }))} placeholder="执行流程" />
                    <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[84px]" value={editDocumentMeta.acceptanceCriteria} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} placeholder="验收标准" />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editDocumentMeta.seoTitle} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, seoTitle: e.target.value }))} placeholder="SEO 标题" />
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editDocumentMeta.seoKeywords} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, seoKeywords: e.target.value }))} placeholder="SEO 关键词，逗号分隔" />
                  <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editDocumentMeta.seoDescription} onChange={(e) => setEditDocumentMeta((prev) => ({ ...prev, seoDescription: e.target.value }))} placeholder="SEO 描述" />
                </div>
                {tab === "standards" && (
                  <>
                    <label className="block text-sm text-muted">参与单位（每行一个，格式：企业名称|参与时间）</label>
                    <textarea
                      className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[88px]"
                      value={editDocumentMeta.contributors.map((item) => `${item.name}${item.joinedAt ? `|${item.joinedAt}` : ""}`).join("\n")}
                      onChange={(e) =>
                        setEditDocumentMeta((prev) => ({
                          ...prev,
                          contributors: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                            const [name, joinedAt] = line.split("|").map((part) => part.trim());
                            return { name, joinedAt };
                          }),
                        }))
                      }
                    />
                    <label className="block text-sm text-muted">版本记录（每行一个，格式：版本|更新时间|修改说明）</label>
                    <textarea
                      className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[110px]"
                      value={editDocumentMeta.versions.map((item) => [item.version, item.updatedAt, item.note].filter(Boolean).join("|")).join("\n")}
                      onChange={(e) =>
                        setEditDocumentMeta((prev) => ({
                          ...prev,
                          versions: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                            const [version, updatedAt, note] = line.split("|").map((part) => part.trim());
                            return { version: version || "未命名版本", updatedAt, note };
                          }),
                        }))
                      }
                    />
                  </>
                )}
              </div>
            )}
            <label className="block text-sm text-muted">关键词（逗号分隔）</label>
            <div className="flex gap-2">
              <input className="flex-1 border border-border rounded px-3 py-2 bg-surface" value={editTagSlugs} onChange={(e) => setEditTagSlugs(e.target.value)} placeholder="如：行业趋势,技术发展,品牌建设" />
              <button type="button" onClick={autoFillEditTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">行业提取</button>
            </div>
            {tab !== "brands" && (
              <>
                <label className="block text-sm text-muted">顶部配图（可选）</label>
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
                      void uploadEditCover(e.target.files?.[0] ?? null);
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
                {tab === "terms" && <p className="text-xs text-muted">最佳尺寸：1600 x 900 px，建议使用横版 16:9 图片。</p>}
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
            {(tab === "terms" || tab === "standards") ? (
              <>
                <label className="block text-sm text-muted">{tab === "terms" ? "词条正文" : "标准正文"}</label>
                <RichEditor
                  value={editContent}
                  onChange={setEditContent}
                  minHeight={360}
                  placeholder={tab === "terms" ? "支持标题、列表、表格、引用、图片的词条正文编辑。" : "支持标题分级、表格、图片和条款结构的标准正文编辑。"}
                />
              </>
            ) : tab === "brands" ? (
              <>
                <label className="block text-sm text-muted">区域选择</label>
                <select
                  className="w-full border border-border rounded px-3 py-2 bg-surface"
                  value={editBrandStructured.serviceAreas || "全国"}
                  onChange={(e) => setEditBrandStructured((prev) => ({ ...prev, serviceAreas: e.target.value }))}
                >
                  {BRAND_REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <label className="block text-sm text-muted">品牌结构化内容</label>
                <BrandStructuredEditor value={editBrandStructured} onChange={setEditBrandStructured} />
              </>
            ) : tab === "industry-data" ? (
              <>
                <label className="block text-sm text-muted">数据结构化内容</label>
                <DataStructuredEditor value={editDataStructured} onChange={setEditDataStructured} />
              </>
            ) : tab === "awards" ? (
              <>
                <label className="block text-sm text-muted">评选结构化内容</label>
                <AwardStructuredEditor value={editAwardStructured} onChange={setEditAwardStructured} />
              </>
            ) : (
              <>
                <label className="block text-sm text-muted">正文</label>
                <RichEditor value={editContent} onChange={setEditContent} minHeight={320} placeholder="" />
              </>
            )}
            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="px-4 py-2 rounded bg-accent text-white text-sm">仅保存修改</button>
              <button type="button" onClick={() => void saveEdit("approved")} className="px-4 py-2 rounded bg-green-600 text-white text-sm">保存并通过</button>
              {editingChangeId && (
                <button type="button" onClick={() => void saveEditAndApproveChange()} className="px-4 py-2 rounded bg-emerald-700 text-white text-sm">
                  保存并通过该修改申请
                </button>
              )}
              <button type="button" onClick={() => void saveEdit("rejected")} className="px-4 py-2 rounded bg-red-600 text-white text-sm">保存并驳回</button>
              <button type="button" onClick={() => { setEditingId(null); setEditingChangeId(null); setReviewAction(null); }} className="px-4 py-2 rounded border border-border text-sm">取消</button>
            </div>
            {reviewAction && <p className="text-xs text-muted">处理中：{STATUS_TEXT[reviewAction]}</p>}
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
