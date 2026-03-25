"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  isRecommend: boolean;
  isBrandVisible: boolean;
  sortOrder: number;
  rankingWeight: number;
  frontDisplay: {
    name: string;
    logoUrl: string | null;
    region: string;
    area: string | null;
    summary: string;
    detailHref: string;
  };
  qualityFlags: {
    missingLogo: boolean;
    missingSummary: boolean;
    missingContact: boolean;
  };
  enterprise: {
    id: string;
    memberId: string;
    companyName: string | null;
    companyShortName: string | null;
    member?: {
      memberType: string;
      rankingWeight: number;
    } | null;
  } | null;
};

type ApiResponse = {
  items: BrandRow[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  stats?: {
    visibleTotal?: number;
    recommendedTotal?: number;
    needsAttentionTotal?: number;
  };
};

const PAGE_SIZE = 20;

function issueLabels(item: BrandRow) {
  return [
    item.qualityFlags.missingLogo ? "缺 Logo" : null,
    item.qualityFlags.missingSummary ? "缺摘要" : null,
    item.qualityFlags.missingContact ? "缺联系" : null,
  ].filter(Boolean) as string[];
}

function memberTypeLabel(item: BrandRow) {
  const memberType = item.enterprise?.member?.memberType || "enterprise_basic";
  if (memberType === "enterprise_advanced") return "VIP 企业";
  if (memberType === "enterprise_basic") return "企业会员";
  return memberType;
}

export default function AdminBrandsPage() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [stats, setStats] = useState({
    visibleTotal: 0,
    recommendedTotal: 0,
    needsAttentionTotal: 0,
  });

  const load = useCallback(async (search = "", needsAttention = false, nextPage = 1) => {
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(nextPage) });
    if (search.trim()) params.set("q", search.trim());
    if (needsAttention) params.set("quality", "needs_attention");

    const res = await fetch(`/api/admin/brands?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { error?: string };
    if (!res.ok) {
      setItems([]);
      setTotal(0);
      setPage(1);
      setTotalPages(1);
      setStats({ visibleTotal: 0, recommendedTotal: 0, needsAttentionTotal: 0 });
      setMessage(data.error ?? "品牌列表加载失败");
      setLoading(false);
      return;
    }

    const nextItems = Array.isArray(data.items) ? data.items : [];
    setItems(nextItems);
    setTotal(typeof data.total === "number" ? data.total : nextItems.length);
    setPage(typeof data.page === "number" ? data.page : nextPage);
    setTotalPages(typeof data.totalPages === "number" ? data.totalPages : Math.max(1, Math.ceil((typeof data.total === "number" ? data.total : nextItems.length) / PAGE_SIZE)));
    setStats({
      visibleTotal: typeof data.stats?.visibleTotal === "number" ? data.stats.visibleTotal : 0,
      recommendedTotal: typeof data.stats?.recommendedTotal === "number" ? data.stats.recommendedTotal : 0,
      needsAttentionTotal: typeof data.stats?.needsAttentionTotal === "number" ? data.stats.needsAttentionTotal : 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load("", false, 1);
  }, [load]);

  const currentPageVisibleCount = useMemo(() => items.filter((item) => item.isBrandVisible).length, [items]);

  async function updateBrand(id: string, patch: Partial<BrandRow>) {
    setSavingId(id);
    setMessage("");
    const res = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BrandRow> & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "品牌设置更新失败");
      setSavingId(null);
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === id ? ({ ...item, ...data } as BrandRow) : item)));
    setSavingId(null);
  }

  async function runBatchAction(patch: Pick<BrandRow, "isBrandVisible"> | Pick<BrandRow, "isRecommend">, successMessage: string) {
    if (items.length === 0) return;
    setBatchSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/brands/batch", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: items.map((item) => item.id),
        patch,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "批量操作失败");
      setBatchSaving(false);
      return;
    }

    setItems((prev) => prev.map((item) => ({ ...item, ...patch })));
    setStats((prev) => ({
      ...prev,
      visibleTotal:
        "isBrandVisible" in patch
          ? prev.visibleTotal + (patch.isBrandVisible ? items.filter((item) => !item.isBrandVisible).length : -items.filter((item) => item.isBrandVisible).length)
          : prev.visibleTotal,
      recommendedTotal:
        "isRecommend" in patch
          ? prev.recommendedTotal + (patch.isRecommend ? items.filter((item) => !item.isRecommend).length : -items.filter((item) => item.isRecommend).length)
          : prev.recommendedTotal,
    }));
    setMessage(successMessage);
    setBatchSaving(false);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Management</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-primary">品牌管理</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
              这里用于统一管理前台品牌展示。管理员先在列表里判断哪些企业需要前台显示，再进入详情页维护 Logo、简介、联系方式和展示资料。
            </p>
          </div>
          <div className="grid min-w-[300px] grid-cols-3 gap-3 text-center text-sm">
            <StatCard label="品牌总数" value={String(total)} />
            <StatCard label="前台显示" value={String(stats.visibleTotal)} />
            <StatCard label="待完善" value={String(stats.needsAttentionTotal)} tone={stats.needsAttentionTotal > 0 ? "accent" : "normal"} />
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[24px] border border-[rgba(181,157,121,0.16)] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
        <form
          className="grid gap-3 lg:grid-cols-[1fr,auto,auto,auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void load(q, onlyNeedsAttention, 1);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="h-12 rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
            placeholder="搜索企业名、品牌名、地区、产品体系"
          />
          <label className="inline-flex h-12 items-center gap-2 rounded-[16px] border border-border bg-surface px-4 text-sm text-primary">
            <input type="checkbox" checked={onlyNeedsAttention} onChange={(event) => setOnlyNeedsAttention(event.target.checked)} />
            只看待完善资料
          </label>
          <button className="h-12 rounded-[16px] bg-accent px-5 text-sm font-medium text-white">搜索</button>
          <button
            type="button"
            className="h-12 rounded-[16px] border border-border px-5 text-sm text-primary transition hover:bg-surface"
            onClick={() => {
              setQ("");
              setOnlyNeedsAttention(false);
              void load("", false, 1);
            }}
          >
            重置
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">后台列表每页展示 20 家，排序优先级为：前台显示中的企业优先、推荐品牌优先、人工排序值优先、会员权重优先。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={batchSaving || loading || items.length === 0}
            onClick={() => void runBatchAction({ isBrandVisible: true }, "本页品牌已一键设为前台显示。")}
            className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            本页一键显示
          </button>
          <button
            type="button"
            disabled={batchSaving || loading || items.length === 0}
            onClick={() => void runBatchAction({ isBrandVisible: false }, "本页品牌已一键隐藏。")}
            className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            本页一键隐藏
          </button>
          <button
            type="button"
            disabled={batchSaving || loading || items.length === 0}
            onClick={() => void runBatchAction({ isRecommend: true }, "本页品牌已一键设为推荐。")}
            className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            本页一键推荐
          </button>
          <button
            type="button"
            disabled={batchSaving || loading || items.length === 0}
            onClick={() => void runBatchAction({ isRecommend: false }, "本页品牌已一键取消推荐。")}
            className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            本页取消推荐
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="hidden border-b border-border px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted lg:grid lg:grid-cols-[64px_minmax(0,1.5fr)_120px_120px_150px_120px_140px] lg:gap-4">
          <span>序号</span>
          <span>企业 / 品牌</span>
          <span>会员类型</span>
          <span>前台显示</span>
          <span>资料状态</span>
          <span>推荐</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted">加载品牌列表中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-muted">当前没有匹配的品牌数据。</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const issues = issueLabels(item);
              const disabled = savingId === item.id;
              const rowNumber = (page - 1) * PAGE_SIZE + items.findIndex((row) => row.id === item.id) + 1;
              return (
                <article key={item.id} className="px-5 py-4">
                  <div className="grid gap-4 lg:grid-cols-[64px_minmax(0,1.5fr)_120px_120px_150px_120px_140px] lg:items-center">
                    <div className="text-sm font-medium text-muted">{rowNumber}</div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-primary">{item.frontDisplay.name}</p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {item.frontDisplay.region}
                        {item.frontDisplay.area ? ` / ${item.frontDisplay.area}` : ""}
                        {item.enterprise?.companyName && item.enterprise.companyName !== item.frontDisplay.name ? ` / ${item.enterprise.companyName}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{item.frontDisplay.summary}</p>
                    </div>

                    <div className="text-sm text-primary">{memberTypeLabel(item)}</div>

                    <div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void updateBrand(item.id, { isBrandVisible: !item.isBrandVisible })}
                        className={`rounded-full px-3 py-1.5 text-sm transition ${item.isBrandVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {item.isBrandVisible ? "显示中" : "已隐藏"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {issues.length > 0 ? (
                        issues.map((label) => (
                          <span key={label} className="rounded-full border border-[rgba(181,157,121,0.18)] bg-[rgba(255,249,238,0.92)] px-2.5 py-1 text-xs text-accent">
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">完整</span>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void updateBrand(item.id, { isRecommend: !item.isRecommend })}
                        className={`rounded-full px-3 py-1.5 text-sm transition ${item.isRecommend ? "bg-[rgba(245,236,220,0.85)] text-accent" : "bg-slate-100 text-slate-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {item.isRecommend ? "推荐中" : "普通"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <Link href={`/membership/admin/brands/${item.id}`} className="text-accent hover:underline">
                        管理详情
                      </Link>
                      <Link href={item.frontDisplay.detailHref} target="_blank" className="text-primary hover:underline">
                        前台查看
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="space-y-3 text-sm text-muted">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>当前第 {page} / {totalPages} 页，本页前台显示 {currentPageVisibleCount} 家。</span>
          <span>推荐品牌共 {stats.recommendedTotal} 家，管理员可直接在列表中控制前台显示与推荐状态。</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void load(q, onlyNeedsAttention, page - 1)}
            className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => void load(q, onlyNeedsAttention, page + 1)}
            className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "accent" }) {
  return (
    <div className={`rounded-[20px] border px-3 py-3 ${tone === "accent" ? "border-[rgba(181,157,121,0.2)] bg-[rgba(255,249,238,0.92)]" : "border-border bg-white"}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}
