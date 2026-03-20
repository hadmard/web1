"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type Row = {
  id: string;
  title?: string | null;
  imageUrl?: string;
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
};

const STATUS_TEXT: Record<Row["status"], string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

export default function MembershipContentStatusPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  async function load(query = "") {
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!meRes.ok) {
      setAuthed(false);
      return;
    }
    setAuthed(true);

    const sp = new URLSearchParams({ limit: "100" });
    if (query.trim()) sp.set("q", query.trim());
    const aRes = await fetch(`/api/member/articles?${sp.toString()}`, { credentials: "include" });
    if (aRes.ok) {
      const d = await aRes.json();
      setArticles(d.items ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    void load(search);
  }

  function clearSearch() {
    setSearch("");
    void load("");
  }

  const summary = useMemo(() => {
    const all = [...articles];
    return {
      draft: all.filter((x) => x.status === "draft").length,
      pending: all.filter((x) => x.status === "pending").length,
      approved: all.filter((x) => x.status === "approved").length,
      rejected: all.filter((x) => x.status === "rejected").length,
    };
  }, [articles]);

  if (authed === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后查看审核状态。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">
          首页
        </Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">
          会员系统
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">内容审核状态</span>
      </nav>

      <h1 className="mb-4 font-serif text-2xl font-bold text-primary">内容审核状态</h1>

      <InlinePageBackLink href="/membership" label="返回会员系统" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["draft", "pending", "approved", "rejected"] as const).map((k) => (
          <div key={k} className="rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-xs text-muted">{STATUS_TEXT[k]}</p>
            <p className="text-lg font-semibold text-primary">{summary[k]}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={submitSearch}
        className="mb-6 flex flex-col gap-3 rounded-[22px] border border-border bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,243,236,0.94))] p-4 md:flex-row md:items-center"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">搜索我的内容</p>
          <p className="mt-1 text-xs text-muted">支持按标题、摘要、正文、来源、作者、关键词查找。</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-2xl border border-[rgba(194,182,154,0.28)] bg-white/90 px-4 text-sm text-primary placeholder:text-muted focus:border-[rgba(180,154,107,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(180,154,107,0.18)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入标题、作者、来源、关键词"
          />
          <button type="submit" className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white">
            搜索
          </button>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-2xl border border-border px-4 py-2 text-sm text-primary hover:bg-surface"
            >
              清除
            </button>
          )}
        </div>
      </form>

      <section className="mb-6 rounded-lg border border-border p-4">
        <h2 className="mb-3 font-medium text-primary">资讯审核记录</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-muted">暂无资讯记录</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {articles.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-border pb-2">
                <span className="truncate text-primary">{item.title || item.id}</span>
                <span className="text-muted">{STATUS_TEXT[item.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
