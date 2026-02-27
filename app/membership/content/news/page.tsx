"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { NEWS_SUBCATEGORY_OPTIONS } from "@/lib/content-taxonomy";

type ArticleItem = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
};

const STATUS_TEXT: Record<ArticleItem["status"], string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

function makeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default function MembershipContentNewsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [memberType, setMemberType] = useState<string>("personal");
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [subHref, setSubHref] = useState("/news/trends");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!meRes.ok) {
      setAuthed(false);
      return;
    }
    setAuthed(true);

    const listRes = await fetch("/api/member/articles?limit=20", { credentials: "include" });

    const me = await meRes.json();
    setMemberType(me.memberType ?? "personal");

    if (listRes.ok) {
      const data = await listRes.json();
      setItems(data.items ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      title: title.trim(),
      slug: (slug || makeSlug(title)).trim(),
      content: content.trim(),
      subHref,
      categoryHref: "/news",
      syncToMainSite: true,
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

    setMessage("提交成功，已进入待审核队列");
    setTitle("");
    setSlug("");
    setContent("");
    await load();
    setLoading(false);
  }

  const canPublish = memberType === "enterprise_basic" || memberType === "enterprise_advanced";

  if (authed === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后再发布资讯内容。</p>
        <Link href="/membership/login" className="text-sm text-accent hover:underline">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">资讯发布</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-2">资讯发布</h1>
      <p className="text-sm text-muted mb-6">企业会员提交内容后默认待审核，审核通过后同步到主站栏目。</p>

      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      {!canPublish ? (
        <div className="rounded-lg border border-border p-4 text-sm text-muted">个人会员不具备企业资讯发布权限。</div>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-border p-4 bg-surface-elevated space-y-3 mb-8">
          <label className="block text-sm text-muted">标题</label>
          <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label className="block text-sm text-muted">Slug（可选）</label>
          <input className="w-full border border-border rounded px-3 py-2 bg-surface" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="不填将根据标题自动生成" />

          <label className="block text-sm text-muted">所属子栏目</label>
          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
            {NEWS_SUBCATEGORY_OPTIONS.map((option) => {
              const active = subHref === option.href;
              return (
                <button
                  key={option.href}
                  type="button"
                  onClick={() => setSubHref(option.href)}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${active ? "bg-accent text-white" : "bg-surface-elevated text-primary border border-border hover:bg-surface"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <label className="block text-sm text-muted">正文</label>
          <textarea className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[140px]" value={content} onChange={(e) => setContent(e.target.value)} required />

          <button disabled={loading} className="px-4 py-2 rounded bg-accent text-white text-sm disabled:opacity-50">
            {loading ? "提交中..." : "提交审核"}
          </button>
        </form>
      )}

      <div className="rounded-lg border border-border p-4">
        <h2 className="font-medium text-primary mb-3">我的资讯</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">暂无记录</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <span className="text-primary truncate">{item.title}</span>
                <span className="text-muted">{STATUS_TEXT[item.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
