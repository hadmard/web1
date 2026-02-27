"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = { id: string; title?: string | null; imageUrl?: string; status: "draft" | "pending" | "approved" | "rejected"; createdAt: string };

const STATUS_TEXT: Record<Row["status"], string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

export default function MembershipContentStatusPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        setAuthed(false);
        return;
      }
      setAuthed(true);

      const aRes = await fetch("/api/member/articles?limit=100", { credentials: "include" });
      if (aRes.ok) {
        const d = await aRes.json();
        setArticles(d.items ?? []);
      }
    })();
  }, []);

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
        <span className="text-primary">内容审核状态</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-4">内容审核状态</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {(["draft", "pending", "approved", "rejected"] as const).map((k) => (
          <div key={k} className="rounded-lg border border-border p-3 bg-surface-elevated">
            <p className="text-xs text-muted">{STATUS_TEXT[k]}</p>
            <p className="text-lg font-semibold text-primary">{summary[k]}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border p-4 mb-6">
        <h2 className="font-medium text-primary mb-3">资讯审核记录</h2>
        {articles.length === 0 ? <p className="text-sm text-muted">暂无资讯记录</p> : (
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
