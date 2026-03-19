"use client";

import { useEffect, useMemo, useState } from "react";

type StatsResponse = {
  overview: {
    totalMembers: number;
    todayMembers: number;
    enterpriseMembers: number;
    totalEnterprises: number;
    approvedArticles: number;
    draftArticles: number;
    pendingArticles: number;
    rejectedArticles: number;
    totalViews: number;
    averageViewsPerArticle: number;
    totalQuestions: number;
    answeredQuestions: number;
  };
  review: {
    pendingArticles: number;
    pendingChanges: number;
    pendingEnterpriseVerifications: number;
    pendingGallery: number;
    pendingStandardFeedback: number;
    totalPending: number;
  };
  contentByTab: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    publishedAt: string | null;
    tabKey: string;
  }>;
  recentTrend: Array<{
    day: string;
    label: string;
    publishedArticles: number;
    newMembers: number;
    newQuestions: number;
  }>;
};

function NumberCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,242,234,0.96))] p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-sm text-muted">{helper}</p>
    </article>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "未发布";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          setError(data?.error ?? "数据统计加载失败");
          setStats(null);
          return;
        }
        setStats(data as StatsResponse);
        setError("");
      } catch {
        setError("网络异常，暂时无法读取统计数据");
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxTrendValue = useMemo(() => {
    if (!stats) return 1;
    return Math.max(
      1,
      ...stats.recentTrend.flatMap((item) => [item.publishedArticles, item.newMembers, item.newQuestions])
    );
  }, [stats]);

  if (loading) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted">统计数据加载中...</div>;
  }

  if (!stats) {
    return <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm text-muted">{error || "暂无统计数据"}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(198,170,118,0.18),transparent_42%),linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,243,236,0.96))] p-6 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.32)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8f7b59]">数据统计</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0.02em] text-primary">整木网后台运营看板</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          这页按你网站当前的真实数据来统计，重点看内容产出、审核积压、会员增长和用户互动，方便管理员每天快速判断站点运行情况。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NumberCard label="总阅读量" value={String(stats.overview.totalViews)} helper={`已发布文章人均 ${stats.overview.averageViewsPerArticle} 次阅读`} />
        <NumberCard label="已发布内容" value={String(stats.overview.approvedArticles)} helper={`草稿 ${stats.overview.draftArticles} 篇，待审 ${stats.overview.pendingArticles} 篇`} />
        <NumberCard label="会员规模" value={String(stats.overview.totalMembers)} helper={`今日新增 ${stats.overview.todayMembers}，企业会员 ${stats.overview.enterpriseMembers}`} />
        <NumberCard label="待处理审核" value={String(stats.review.totalPending)} helper={`文章、改稿、企业认证、图库、反馈的合计待办`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">近 7 天趋势</h2>
              <p className="mt-1 text-sm text-muted">观察内容发布、会员增长和用户提问有没有持续发生。</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-3">
            {stats.recentTrend.map((item) => (
              <div key={item.day} className="rounded-2xl border border-border bg-[rgba(255,252,247,0.75)] px-3 py-4">
                <p className="text-center text-xs text-muted">{item.day}</p>
                <div className="mt-4 flex h-36 items-end justify-center gap-1.5">
                  {[
                    { key: "published", value: item.publishedArticles, color: "bg-[#b99763]" },
                    { key: "members", value: item.newMembers, color: "bg-[#557c6d]" },
                    { key: "questions", value: item.newQuestions, color: "bg-[#7e6aa8]" },
                  ].map((bar) => (
                    <div key={bar.key} className="flex w-4 flex-col items-center justify-end">
                      <div
                        className={`w-full rounded-full ${bar.color}`}
                        style={{ height: `${Math.max(10, Math.round((bar.value / maxTrendValue) * 110))}px`, opacity: bar.value > 0 ? 1 : 0.18 }}
                        title={`${bar.key}: ${bar.value}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1 text-[11px] text-muted">
                  <p>发布 {item.publishedArticles}</p>
                  <p>新增会员 {item.newMembers}</p>
                  <p>提问 {item.newQuestions}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#b99763]" />内容发布</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#557c6d]" />新增会员</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#7e6aa8]" />用户提问</span>
          </div>
        </article>

        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <h2 className="text-lg font-semibold text-primary">审核与互动</h2>
          <p className="mt-1 text-sm text-muted">这几项最适合每天优先看，能快速知道后台有没有积压。</p>
          <div className="mt-5 space-y-3">
            {[
              { label: "待审文章", value: stats.review.pendingArticles },
              { label: "待审修改申请", value: stats.review.pendingChanges },
              { label: "待审企业认证", value: stats.review.pendingEnterpriseVerifications },
              { label: "待审图库内容", value: stats.review.pendingGallery },
              { label: "待处理标准反馈", value: stats.review.pendingStandardFeedback },
              { label: "用户提问总数", value: stats.overview.totalQuestions },
              { label: "已回复提问", value: stats.overview.answeredQuestions },
              { label: "企业档案数量", value: stats.overview.totalEnterprises },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
                <span className="text-sm text-primary">{item.label}</span>
                <strong className="text-lg font-semibold text-primary">{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <h2 className="text-lg font-semibold text-primary">栏目内容分布</h2>
          <p className="mt-1 text-sm text-muted">看站内主要栏目当前已发布内容量，判断内容重心有没有失衡。</p>
          <div className="mt-5 space-y-3">
            {stats.contentByTab.map((item, index) => {
              const max = Math.max(1, stats.contentByTab[0]?.count ?? 1);
              const width = `${Math.max(10, Math.round((item.count / max) * 100))}%`;
              return (
                <div key={item.key} className="rounded-2xl border border-border bg-[rgba(255,252,247,0.72)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-primary">{item.label}</p>
                      <p className="mt-1 text-xs text-muted">栏目排名 #{index + 1}</p>
                    </div>
                    <strong className="text-lg font-semibold text-primary">{item.count}</strong>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-[rgba(194,182,154,0.22)]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#cab07a,#8f6f43)]" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <h2 className="text-lg font-semibold text-primary">热门文章 Top 8</h2>
          <p className="mt-1 text-sm text-muted">优先观察哪些内容真的被读者看到了，方便后续选题和栏目调整。</p>
          <div className="mt-5 space-y-3">
            {stats.topArticles.length === 0 ? (
              <p className="text-sm text-muted">当前还没有已发布文章。</p>
            ) : (
              stats.topArticles.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8f7b59]">TOP {index + 1}</p>
                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-primary">{item.title}</p>
                      <p className="mt-2 text-xs text-muted">发布时间：{formatDateTime(item.publishedAt)}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-[rgba(180,154,107,0.26)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">阅读量</p>
                      <p className="mt-1 text-lg font-semibold text-primary">{item.viewCount}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
