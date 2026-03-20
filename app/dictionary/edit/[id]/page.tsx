"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  updatedAt: string;
};

type TermSection = { id: string; heading: string; body: string };

const DEFAULT_TERM_SECTIONS: Omit<TermSection, "id">[] = [
  { heading: "发展背景", body: "" },
  { heading: "核心特征", body: "" },
  { heading: "技术结构", body: "" },
  { heading: "行业意义", body: "" },
];

function createDefaultTermSections(): TermSection[] {
  return DEFAULT_TERM_SECTIONS.map((x, i) => ({ id: `default-${i + 1}`, heading: x.heading, body: x.body }));
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

export default function DictionaryEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [canDirectEdit, setCanDirectEdit] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [sections, setSections] = useState<TermSection[]>(createDefaultTermSections());
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/member/dictionary-entries/${id}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        setAuthed(false);
      } else {
        setMessage(data.error ?? "加载失败");
      }
      setLoading(false);
      return;
    }

    const article = data.article as Item;
    setItem(article);
    setTitle(article.title ?? "");
    setExcerpt(article.excerpt ?? "");
    setSections(parseTermContentSections(article.content ?? ""));
    setCanDirectEdit(data.canDirectEdit === true);
    setAuthed(true);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id, load]);

  useEffect(() => {
    if (!message) return;
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message]);

  function updateSection(idValue: string, patch: Partial<Omit<TermSection, "id">>) {
    setSections((prev) => prev.map((x) => (x.id === idValue ? { ...x, ...patch } : x)));
  }

  function addSection() {
    setSections((prev) => [...prev, { id: `section-${Date.now()}`, heading: "", body: "" }]);
  }

  function removeSection(idValue: string) {
    setSections((prev) => prev.filter((x) => x.id !== idValue));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setMessage("");

    const content = buildTermContentHtml(sections);

    const res = await fetch(`/api/member/dictionary-entries/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        excerpt,
        content,
        reason: reason.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "提交失败");
      setSaving(false);
      return;
    }

    if (data.mode === "direct") {
      setMessage("修改已直接生效。");
    } else {
      setMessage("修改申请已提交，等待主管理员审核。");
      setReason("");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-muted">加载中...</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-muted mb-3">请先登录后再修改词条。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  if (!item) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-muted">词条不存在或不可修改。</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/dictionary" className="hover:text-accent">整木词库</Link>
        <span className="mx-2">/</span>
        <Link href={`/dictionary/${item.slug}`} className="hover:text-accent">{item.title}</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">提出修改</span>
      </nav>

      <header className="rounded-xl border border-border bg-surface-elevated p-5">
        <h1 className="font-serif text-2xl font-bold text-primary">词条修改</h1>
        <p className="text-sm text-muted mt-2">
          当前模式：{canDirectEdit ? "直接修改并生效" : "提交修改申请，待审核后生效"}
        </p>
        <p className="text-xs text-muted mt-1">词库采用固定结构提交：默认小标题分节编辑，不提供自由正文编辑器。</p>
        {message && (
          <p ref={messageRef} className="text-sm text-accent mt-2 scroll-mt-24">
            {message}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="rounded-xl border border-border bg-surface-elevated p-5 space-y-3">
        <label className="block text-sm text-muted">词条标题</label>
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label className="block text-sm text-muted">摘要</label>
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px]"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />

        <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
          <p className="text-xs text-muted">固定小标题结构</p>
          {sections.map((sec, idx) => (
            <div key={sec.id} className="rounded-md border border-border bg-surface-elevated p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">小节 {idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeSection(sec.id)}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-surface"
                  disabled={sections.length <= 1}
                >
                  删除
                </button>
              </div>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-surface"
                placeholder="小标题，如：发展背景"
                value={sec.heading}
                onChange={(e) => updateSection(sec.id, { heading: e.target.value })}
              />
              <textarea
                className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[90px]"
                placeholder="该小标题下的解释内容"
                value={sec.body}
                onChange={(e) => updateSection(sec.id, { body: e.target.value })}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={addSection} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
              添加小标题
            </button>
            <button type="button" onClick={() => setSections(createDefaultTermSections())} className="text-xs px-3 py-2 rounded border border-border hover:bg-surface">
              恢复默认小标题
            </button>
          </div>
        </div>

        {!canDirectEdit && (
          <>
            <label className="block text-sm text-muted">修改说明（将给审核人看）</label>
            <input
              className="w-full border border-border rounded px-3 py-2 bg-surface"
              placeholder="例如：补充术语定义，修正错别字"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-accent text-white text-sm disabled:opacity-50"
          >
            {saving ? "提交中..." : canDirectEdit ? "保存修改" : "提交审核"}
          </button>
          <Link href={`/dictionary/${item.slug}`} className="px-4 py-2 rounded border border-border text-sm">
            返回词条
          </Link>
        </div>
      </form>
    </div>
  );
}
