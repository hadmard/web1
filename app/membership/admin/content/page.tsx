"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONTENT_TAB_DEFS, MEMBER_PUBLISH_CATEGORY_OPTIONS, type ContentTabKey } from "@/lib/content-taxonomy";
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

type Status = "draft" | "pending" | "approved" | "rejected";
type Mode = "publish" | "manage" | "review";
type TermSection = { id: string; heading: string; body: string };

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
  excerpt?: string | null;
  content: string;
  subHref?: string | null;
  categoryHref?: string | null;
  tagSlugs?: string | null;
  status: Status;
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
  patchTagSlugs?: string | null;
  patchSubHref?: string | null;
  article: { id: string; title: string; excerpt?: string | null; content?: string | null; tagSlugs?: string | null; subHref?: string | null };
  submitter: { name: string | null; email: string; role: string | null };
};

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

function parseTermContentSections(html: string): TermSection[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const blocks = Array.from(doc.querySelectorAll("section"));
    const fromSections = blocks
      .map((node, idx) => {
        const heading = (node.querySelector("h1,h2,h3,h4,h5,h6")?.textContent || "").trim();
        const body = (node.querySelector("p")?.textContent || node.textContent || "").trim();
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

export default function AdminContentPage() {
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const tab = parseTab(searchParams.get("tab"));

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const [items, setItems] = useState<ArticleItem[]>([]);
  const [pendingItems, setPendingItems] = useState<ArticleItem[]>([]);
  const [pendingChanges, setPendingChanges] = useState<ChangeRequestItem[]>([]);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [termSections, setTermSections] = useState<TermSection[]>(createDefaultTermSections());
  const [brandStructured, setBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [standardStructured, setStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [dataStructured, setDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [awardStructured, setAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [subHref, setSubHref] = useState("");
  const [tagSlugs, setTagSlugs] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTermSections, setEditTermSections] = useState<TermSection[]>(createDefaultTermSections());
  const [editBrandStructured, setEditBrandStructured] = useState<BrandStructuredData>(createDefaultBrandStructuredData());
  const [editStandardStructured, setEditStandardStructured] = useState<StandardStructuredData>(createDefaultStandardStructuredData());
  const [editDataStructured, setEditDataStructured] = useState<DataStructuredData>(createDefaultDataStructuredData());
  const [editAwardStructured, setEditAwardStructured] = useState<AwardStructuredData>(createDefaultAwardStructuredData());
  const [editTagSlugs, setEditTagSlugs] = useState("");
  const [editSubHref, setEditSubHref] = useState("");
  const [reviewAction, setReviewAction] = useState<Status | null>(null);


  const selectedTabDef = useMemo(() => CONTENT_TAB_DEFS.find((x) => x.key === tab) ?? CONTENT_TAB_DEFS[0], [tab]);
  const selectedCategory = useMemo(() => MEMBER_PUBLISH_CATEGORY_OPTIONS.find((x) => x.href === selectedTabDef.href) ?? MEMBER_PUBLISH_CATEGORY_OPTIONS[0], [selectedTabDef.href]);
  const subOptions = selectedCategory.subs;
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

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

  async function loadSession() {
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
  }

  async function loadList() {
    const sp = new URLSearchParams({ limit: "100", categoryHref: selectedCategory.href });
    const res = await fetch(`/api/admin/articles?${sp.toString()}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  async function loadReview() {
    const sp = new URLSearchParams({ status: "pending", limit: "200", categoryHref: selectedCategory.href });
    const [a, c] = await Promise.all([
      fetch(`/api/admin/articles?${sp.toString()}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/admin/article-change-requests?${sp.toString()}`, { credentials: "include", cache: "no-store" }),
    ]);
    const ad = await a.json().catch(() => ({}));
    const cd = await c.json().catch(() => ({}));
    setPendingItems(Array.isArray(ad.items) ? ad.items : []);
    setPendingChanges(Array.isArray(cd.items) ? cd.items : []);
  }

  useEffect(() => { void loadSession(); }, []);
  useEffect(() => {
    if (!session) return;
    if (mode === "manage") void loadList();
    if (mode === "review" && isSuperAdmin) void loadReview();
  }, [session, mode, tab]);

  useEffect(() => {
    if (!message) return;
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message]);

  async function submitPublish(e: FormEvent) {
    e.preventDefault();
    const composedContent =
      tab === "terms"
        ? buildTermContentHtml(termSections)
        : tab === "brands"
          ? buildBrandStructuredHtml(brandStructured)
          : tab === "standards"
            ? buildStandardStructuredHtml(standardStructured)
            : tab === "industry-data"
              ? buildDataStructuredHtml(dataStructured)
              : tab === "awards"
                ? buildAwardStructuredHtml(awardStructured)
          : content;
    const res = await fetch("/api/admin/articles", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        excerpt: excerpt || null,
        content: composedContent,
        coverImage:
          tab === "brands"
            ? brandStructured.logoUrl.trim() || null
            : null,
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
        syncToMainSite: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data.error ?? "发布失败"); return; }
    setMessage("提交成功。");
    setTitle("");
    setExcerpt("");
    setContent("");
    setTagSlugs("");
    setTermSections(createDefaultTermSections());
    setBrandStructured(createDefaultBrandStructuredData());
    setStandardStructured(createDefaultStandardStructuredData());
    setDataStructured(createDefaultDataStructuredData());
    setAwardStructured(createDefaultAwardStructuredData());
  }

  function openEdit(item: ArticleItem) {
    setEditingId(item.id);
    setEditingChangeId(null);
    setEditTitle(item.title);
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
    setEditTagSlugs(item.tagSlugs ?? "");
    setEditSubHref(item.subHref ?? subHref);
  }

  function openEditFromChange(item: ChangeRequestItem) {
    const nextContent = item.patchContent ?? item.article.content ?? "";
    setEditingId(item.article.id);
    setEditingChangeId(item.id);
    setEditTitle(item.patchTitle ?? item.article.title);
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
    setEditTagSlugs(item.patchTagSlugs ?? item.article.tagSlugs ?? "");
    setEditSubHref(item.patchSubHref ?? item.article.subHref ?? subHref);
  }

  async function saveEdit(nextStatus?: Status) {
    if (!editingId) return;
    setReviewAction(nextStatus ?? null);
    const composedEditContent =
      tab === "terms"
        ? buildTermContentHtml(editTermSections)
        : tab === "brands"
          ? buildBrandStructuredHtml(editBrandStructured)
          : tab === "standards"
            ? buildStandardStructuredHtml(editStandardStructured)
            : tab === "industry-data"
              ? buildDataStructuredHtml(editDataStructured)
              : tab === "awards"
                ? buildAwardStructuredHtml(editAwardStructured)
          : editContent;
    const res = await fetch(`/api/admin/articles/${editingId}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        excerpt: editExcerpt || null,
        content: composedEditContent,
        coverImage: tab === "brands" ? editBrandStructured.logoUrl.trim() || null : undefined,
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
        status: nextStatus,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data.error ?? "保存失败"); setReviewAction(null); return; }
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
    const sourceText =
      tab === "terms"
        ? termSections.map((x) => `${x.heading} ${x.body}`).join(" ")
        : tab === "brands"
          ? brandStructuredToSearchText(brandStructured)
          : tab === "standards"
            ? standardStructuredToSearchText(standardStructured)
            : tab === "industry-data"
              ? dataStructuredToSearchText(dataStructured)
              : tab === "awards"
                ? awardStructuredToSearchText(awardStructured)
          : content;
    const tags = suggestTagsFromText([title, excerpt, sourceText, selectedCategory.href, subHref].filter(Boolean).join(" "));
    setTagSlugs(tags.join(","));
    setMessage(tags.length > 0 ? "已自动识别标签，可手动修改。" : "未识别到明显标签，请手动补充。");
  }

  function autoFillEditTags() {
    const sourceText =
      tab === "terms"
        ? editTermSections.map((x) => `${x.heading} ${x.body}`).join(" ")
        : tab === "brands"
          ? brandStructuredToSearchText(editBrandStructured)
          : tab === "standards"
            ? standardStructuredToSearchText(editStandardStructured)
            : tab === "industry-data"
              ? dataStructuredToSearchText(editDataStructured)
              : tab === "awards"
                ? awardStructuredToSearchText(editAwardStructured)
          : editContent;
    const tags = suggestTagsFromText([editTitle, editExcerpt, sourceText, selectedCategory.href, subHref].filter(Boolean).join(" "));
    setEditTagSlugs(tags.join(","));
    setMessage(tags.length > 0 ? "已自动识别标签，可手动修改。" : "未识别到明显标签，请手动补充。");
  }

  if (loading) return <p className="text-muted">加载中...</p>;
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) return <p className="text-muted">需要管理员权限。</p>;

  return (
    <div className="max-w-6xl space-y-6">
      <header className="rounded-xl border border-border bg-surface-elevated p-5">
        <h1 className="font-serif text-2xl font-bold text-primary">{mode === "publish" ? "内容发布" : mode === "manage" ? "内容管理" : "审核中心"} · {selectedTabDef.label}</h1>
        {message && (
          <p ref={messageRef} className="text-sm text-accent mt-2 scroll-mt-24">
            {message}
          </p>
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
            <label className="block text-sm text-muted">{tab === "standards" ? "标准摘要" : "摘要"}</label><textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            {tab === "terms" && (
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
                  <button type="button" onClick={() => setTermSections(createDefaultTermSections())} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
                    恢复默认模板
                  </button>
                </div>
              </div>
            )}
            <label className="block text-sm text-muted">标签（逗号分隔）</label>
            <div className="flex gap-2">
              <input className="flex-1 border border-border rounded px-3 py-2 bg-surface" value={tagSlugs} onChange={(e) => setTagSlugs(e.target.value)} placeholder="如：行业趋势,技术发展,品牌建设" />
              <button type="button" onClick={autoFillPublishTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">自动识别</button>
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
            {tab === "standards" && (
              <>
                <label className="block text-sm text-muted">标准结构化内容</label>
                <StandardStructuredEditor value={standardStructured} onChange={setStandardStructured} />
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
        <section className="rounded-xl border border-border bg-surface-elevated p-5">
          {items.length === 0 ? <p className="text-sm text-muted">暂无内容</p> : <ul className="space-y-2">{items.map((x) => <li key={x.id} className="border-b border-border pb-2 flex items-center justify-between"><div><p className="text-sm">{x.title}</p><p className="text-xs text-muted">{x.slug} · {STATUS_TEXT[x.status]}</p><p className="text-xs text-muted mt-1">提交账号：{submitterLabel(x.authorMember ?? null)}</p></div><div className="flex gap-2"><button type="button" onClick={() => openEdit(x)} disabled={!canEdit} className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40">修改</button><button type="button" onClick={() => void removeItem(x.id)} disabled={!canDelete} className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 disabled:opacity-40">删除</button></div></li>)}</ul>}
        </section>
      )}

      {mode === "review" && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="text-sm font-semibold mb-3">待审核资讯（{pendingItems.length}）</h2>
            {pendingItems.length === 0 ? (
              <p className="text-sm text-muted">暂无</p>
            ) : (
              <ul className="space-y-2">
                {pendingItems.map((x) => (
                  <li key={x.id} className="border-b border-border pb-2">
                    <p className="text-sm">{x.title}</p>
                    {x.excerpt && <p className="text-xs text-muted mt-1 whitespace-pre-line">摘要：{x.excerpt}</p>}
                    {tab === "standards" && (() => {
                      const parsed = parseStandardStructuredHtml(x.content ?? "");
                      if (!parsed) return null;
                      return (
                        <p className="text-xs text-muted mt-1">
                          标准编号：{parsed.standardCode || "未填写"} · 版本：{parsed.versionNote || "未填写"}
                        </p>
                      );
                    })()}
                    <p className="text-xs text-muted mt-1">提交账号：{submitterLabel(x.authorMember ?? null)}</p>
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => openEdit(x)} className="text-xs px-2 py-1 rounded border border-border">修改后审核</button>
                      <button type="button" onClick={() => void reviewArticle(x.id, "approved")} className="text-xs px-2 py-1 rounded bg-green-600 text-white">通过</button>
                      <button type="button" onClick={() => void reviewArticle(x.id, "rejected")} className="text-xs px-2 py-1 rounded bg-red-600 text-white">驳回</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="text-sm font-semibold mb-3">待审核修改申请（{pendingChanges.length}）</h2>
            {pendingChanges.length === 0 ? (
              <p className="text-sm text-muted">暂无</p>
            ) : (
              <ul className="space-y-3">
                {pendingChanges.map((x) => (
                  <li key={x.id} className="border rounded p-3">
                    <p className="text-sm font-medium">{x.article.title}</p>
                    <p className="text-xs text-muted mt-1">提交账号：{submitterLabel(x.submitter)}</p>
                    {x.reason && <p className="text-xs text-muted mt-1">说明：{x.reason}</p>}
                    {x.diffSummary ? (
                      <div
                        className="mt-2 rounded border border-border bg-surface p-2 text-xs leading-5 overflow-x-auto article-diff"
                        dangerouslySetInnerHTML={{ __html: x.diffSummary }}
                      />
                    ) : (
                      <div className="mt-2 rounded border border-border bg-surface p-2 text-xs text-muted space-y-1">
                        {x.patchTitle && <p>拟修改标题：{x.patchTitle}</p>}
                        {x.patchExcerpt && <p>拟修改摘要：{x.patchExcerpt}</p>}
                        {x.patchContent && <p>拟修改正文：已提交</p>}
                      </div>
                    )}
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button type="button" onClick={() => openEditFromChange(x)} className="text-xs px-2 py-1 rounded border border-border">
                        查看并调整后通过
                      </button>
                      <button type="button" onClick={() => void reviewChange(x.id, "approved")} className="text-xs px-2 py-1 rounded bg-green-600 text-white">直接通过</button>
                      <button type="button" onClick={() => void reviewChange(x.id, "rejected")} className="text-xs px-2 py-1 rounded bg-red-600 text-white">驳回</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {editingId && (
        <section className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="text-sm font-semibold mb-3">编辑内容</h2>
          <form onSubmit={(e) => { e.preventDefault(); void saveEdit(); }} className="space-y-3">
            <label className="block text-sm text-muted">标题</label><input className="w-full border border-border rounded px-3 py-2 bg-surface" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            <label className="block text-sm text-muted">{tab === "standards" ? "标准摘要" : "摘要"}</label><textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px] whitespace-pre-wrap resize-y" value={editExcerpt} onChange={(e) => setEditExcerpt(e.target.value)} />
            <label className="block text-sm text-muted">标签（逗号分隔）</label>
            <div className="flex gap-2">
              <input className="flex-1 border border-border rounded px-3 py-2 bg-surface" value={editTagSlugs} onChange={(e) => setEditTagSlugs(e.target.value)} placeholder="如：行业趋势,技术发展,品牌建设" />
              <button type="button" onClick={autoFillEditTags} className="px-3 py-2 rounded border border-border text-xs hover:bg-surface">自动识别</button>
            </div>
            {tab === "terms" ? (
              <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
                <p className="text-xs text-muted">词库条目编辑（小标题 + 解释）。</p>
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
            ) : tab === "standards" ? (
              <>
                <label className="block text-sm text-muted">标准结构化内容</label>
                <StandardStructuredEditor value={editStandardStructured} onChange={setEditStandardStructured} />
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
    </div>
  );
}
