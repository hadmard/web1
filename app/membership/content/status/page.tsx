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

const STATUS_TONE: Record<Row["status"], string> = {
  draft: "border-border bg-surface text-muted",
  pending: "border-[rgba(180,154,107,0.28)] bg-[rgba(255,248,236,0.9)] text-accent",
  approved: "border-[rgba(112,164,132,0.28)] bg-[rgba(240,249,243,0.92)] text-[#3f6d52]",
  rejected: "border-[rgba(190,122,101,0.28)] bg-[rgba(255,243,239,0.92)] text-[#9b5a45]",
};

export default function MembershipContentStatusPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  async function load(query = "") {
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        setAuthed(false);
        return;
      }
      setAuthed(true);

      const sp = new URLSearchParams({ limit: "100" });
      if (query.trim()) sp.set("q", query.trim());
      const articleRes = await fetch(`/api/member/articles?${sp.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!articleRes.ok) {
        setArticles([]);
        return;
      }

      const payload = await articleRes.json().catch(() => ({}));
      setArticles(payload.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    void load(search);
  }

  function clearSearch() {
    setSearch("");
    void load("");
  }

  const summary = useMemo(() => {
    return {
      total: articles.length,
      draft: articles.filter((item) => item.status === "draft").length,
      pending: articles.filter((item) => item.status === "pending").length,
      approved: articles.filter((item) => item.status === "approved").length,
      rejected: articles.filter((item) => item.status === "rejected").length,
    };
  }, [articles]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后查看审核记录。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <Link href="/membership/content" className="hover:text-accent">会员后台</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">审核记录</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Review Center</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">内容审核记录</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                把稿件的草稿、待审核、已通过和已驳回状态收在一个页面里，平时查记录、跟进审核都从这里看。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard label="总稿件" value={String(summary.total)} />
              <SummaryCard label="待审核" value={String(summary.pending)} />
              <SummaryCard label="已通过" value={String(summary.approved)} />
              <SummaryCard label="已驳回" value={String(summary.rejected)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <form
          onSubmit={submitSearch}
          className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <h2 className="text-lg font-semibold text-primary">搜索我的内容</h2>
          <p className="mt-2 text-sm text-muted">支持按标题、摘要、正文、作者、来源、标签、关键词、企业或品牌名查找，方便快速定位稿件。</p>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              className="h-12 min-w-0 flex-1 rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="输入标题、作者、来源、标签、关键词、企业或品牌"
            />
            <div className="flex gap-2">
              <button type="submit" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                搜索
              </button>
              {search ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-primary transition hover:bg-white"
                >
                  清除
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">状态说明</h2>
          <div className="mt-4 space-y-3 text-sm">
            <StatusExplain label="草稿" desc="仍在编辑中，还没有进入审核队列。" tone={STATUS_TONE.draft} />
            <StatusExplain label="待审核" desc="已提交给平台审核，等待处理结果。" tone={STATUS_TONE.pending} />
            <StatusExplain label="已通过" desc="已经进入前台展示或可被进一步推荐。" tone={STATUS_TONE.approved} />
            <StatusExplain label="已驳回" desc="需要根据审核意见调整内容后重新提交。" tone={STATUS_TONE.rejected} />
          </div>
        </section>
      </section>

      <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">资讯审核记录</h2>
            <p className="mt-2 text-sm text-muted">这里显示最近检索范围内的稿件记录，适合快速看标题、状态和提交时间。</p>
          </div>
          <Link href="/membership/content/publish?tab=articles" className="apple-inline-link">
            去继续发布
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted mt-5">
            还没有匹配到稿件记录，先去发布内容，或换个关键词再试一次。
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {articles.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,244,238,0.86))] px-5 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-medium text-primary">{item.title || item.id}</h3>
                    <p className="mt-2 text-sm text-muted">提交时间：{formatDate(item.createdAt)}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${STATUS_TONE[item.status]}`}>
                    {STATUS_TEXT[item.status]}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/74 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-primary">{value}</p>
    </div>
  );
}

function StatusExplain({ label, desc, tone }: { label: string; desc: string; tone: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-surface px-4 py-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>
        <p className="text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
