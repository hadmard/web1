"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type PendingBrandItem = {
  id: string;
  brandName: string;
  firstNewsId?: string | null;
  lastNewsId?: string | null;
  occurrenceCount: number;
  articleCount: number;
  ruleSource?: string | null;
  triggerReason?: string | null;
  confidence?: number | null;
  approvedSource?: string | null;
  autoApprovedAt?: string | null;
  lastOccurrence?: string | null;
  sourceContext?: string | null;
  status: number;
  createdAt: string;
};

type PendingBrandMetrics = {
  pendingEnterCount: number;
  autoApprovedCount: number;
  manualApprovedCount: number;
  ignoredCount: number;
  highFrequencyPending: Array<{
    id: string;
    brandName: string;
    occurrenceCount: number;
    articleCount: number;
    confidence?: number | null;
    lastOccurrence?: string | null;
  }>;
};

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "0", label: "待审核" },
  { value: "1", label: "已加入词库" },
  { value: "2", label: "已忽略" },
];

function formatTime(value?: string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleString("zh-CN");
}

function statusText(status: number) {
  if (status === 1) return "已加入词库";
  if (status === 2) return "已忽略";
  return "待审核";
}

function statusClassName(status: number) {
  if (status === 1) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === 2) return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function PendingBrandsAdminPage() {
  const [items, setItems] = useState<PendingBrandItem[]>([]);
  const [metrics, setMetrics] = useState<PendingBrandMetrics>({
    pendingEnterCount: 0,
    autoApprovedCount: 0,
    manualApprovedCount: 0,
    ignoredCount: 0,
    highFrequencyPending: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});

  const load = useCallback(async (next?: { q?: string; status?: string }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const q = next?.q ?? search;
    const nextStatus = next?.status ?? status;
    if (q.trim()) params.set("q", q.trim());
    if (nextStatus) params.set("status", nextStatus);

    const res = await fetch(`/api/admin/pending-brands?${params.toString()}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "加载失败");
      setLoading(false);
      return;
    }

    const nextItems = Array.isArray(data.items) ? data.items : [];
    setItems(nextItems);
    setMetrics({
      pendingEnterCount: Number(data.metrics?.pendingEnterCount ?? 0),
      autoApprovedCount: Number(data.metrics?.autoApprovedCount ?? 0),
      manualApprovedCount: Number(data.metrics?.manualApprovedCount ?? 0),
      ignoredCount: Number(data.metrics?.ignoredCount ?? 0),
      highFrequencyPending: Array.isArray(data.metrics?.highFrequencyPending) ? data.metrics.highFrequencyPending : [],
    });
    setWeights((prev) => Object.fromEntries(nextItems.map((item: PendingBrandItem) => [item.id, prev[item.id] ?? "1"])));
    setCategories((prev) => Object.fromEntries(nextItems.map((item: PendingBrandItem) => [item.id, prev[item.id] ?? "品牌"])));
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    await load();
  }

  async function handleApprove(item: PendingBrandItem) {
    setSavingId(item.id);
    setMessage("");
    const res = await fetch(`/api/admin/pending-brands/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        category: categories[item.id] ?? "品牌",
        weight: Number(weights[item.id] ?? "1"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "加入词库失败");
      setSavingId(null);
      return;
    }
    setMessage(`已将“${item.brandName}”加入词库。`);
    await load();
    setSavingId(null);
  }

  async function handleIgnore(item: PendingBrandItem) {
    setSavingId(item.id);
    setMessage("");
    const res = await fetch(`/api/admin/pending-brands/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ignore" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "忽略失败");
      setSavingId(null);
      return;
    }
    setMessage(`已忽略“${item.brandName}”。`);
    await load();
    setSavingId(null);
  }

  const pendingCount = useMemo(() => items.filter((item) => item.status === 0).length, [items]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-[28px] border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(247,242,234,0.94))] px-6 py-6 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
        <h1 className="text-2xl font-semibold text-primary">待审核品牌</h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          系统会先把新闻里识别出的疑似品牌写入这里，再根据阈值自动转正，或由管理员手动处理。
        </p>
        <p className="mt-3 text-sm text-[#8a734d]">当前待审核 {pendingCount} 条</p>
        <div className="mt-4 grid gap-3 text-sm text-muted lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">进入 pending：{metrics.pendingEnterCount}</div>
          <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">自动转正：{metrics.autoApprovedCount}</div>
          <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">手动批准：{metrics.manualApprovedCount}</div>
          <div className="rounded-2xl border border-border bg-white/70 px-4 py-3">已忽略：{metrics.ignoredCount}</div>
        </div>
        {metrics.highFrequencyPending.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-white/70 px-4 py-4 text-sm text-muted">
            <p className="font-medium text-primary">高频触发但未转正</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {metrics.highFrequencyPending.slice(0, 6).map((item) => (
                <span key={item.id} className="rounded-full border border-border px-3 py-1">
                  {item.brandName} · {item.occurrenceCount} 次 / {item.articleCount} 篇
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={submitSearch}
        className="mb-5 flex flex-col gap-3 rounded-[24px] border border-border bg-surface-elevated px-5 py-4 lg:flex-row lg:items-center"
      >
        <input
          className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-primary"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索品牌名或上下文"
        />
        <select
          className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-primary"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-white">
          筛选
        </button>
      </form>

      {message ? <p className="mb-4 text-sm text-accent">{message}</p> : null}

      <div className="overflow-hidden rounded-[24px] border border-border bg-white">
        {loading ? (
          <div className="px-5 py-10 text-sm text-muted">加载中...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted">当前没有待处理品牌。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-[rgba(248,244,237,0.72)] text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">品牌名</th>
                  <th className="px-4 py-3 font-medium">出现次数</th>
                  <th className="px-4 py-3 font-medium">文章数</th>
                  <th className="px-4 py-3 font-medium">最近出现</th>
                  <th className="px-4 py-3 font-medium">规则 / 阈值</th>
                  <th className="px-4 py-3 font-medium">上下文</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const disabled = savingId === item.id || item.status !== 0;
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-primary">{item.brandName}</div>
                        {item.firstNewsId ? <div className="mt-1 text-xs text-muted">首次文章 ID: {item.firstNewsId}</div> : null}
                      </td>
                      <td className="px-4 py-4 text-primary">{item.occurrenceCount}</td>
                      <td className="px-4 py-4 text-primary">{item.articleCount ?? 1}</td>
                      <td className="px-4 py-4 text-muted">{formatTime(item.lastOccurrence)}</td>
                      <td className="px-4 py-4 text-muted">
                        <div>{item.ruleSource || "-"}</div>
                        <div className="mt-1 text-xs">{item.triggerReason || "-"}</div>
                        <div className="mt-1 text-xs">confidence {item.confidence != null ? item.confidence.toFixed(2) : "-"}</div>
                        {item.approvedSource ? (
                          <div className="mt-1 text-xs">
                            {item.approvedSource}
                            {item.autoApprovedAt ? ` · ${formatTime(item.autoApprovedAt)}` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-[28rem] px-4 py-4 text-muted">
                        <p className="line-clamp-4 leading-7">{item.sourceContext || "暂无上下文"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClassName(item.status)}`}>
                          {statusText(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[16rem] flex-col gap-2">
                          <div className="flex gap-2">
                            <select
                              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-primary"
                              value={categories[item.id] ?? "品牌"}
                              onChange={(event) => setCategories((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              disabled={disabled}
                            >
                              <option value="品牌">品牌</option>
                              <option value="企业">企业</option>
                              <option value="品类">品类</option>
                              <option value="展会">展会</option>
                            </select>
                            <select
                              className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-primary"
                              value={weights[item.id] ?? "1"}
                              onChange={(event) => setWeights((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              disabled={disabled}
                            >
                              <option value="1">权重1</option>
                              <option value="2">权重2</option>
                              <option value="3">权重3</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleApprove(item)}
                              disabled={disabled}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                            >
                              加入词库
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleIgnore(item)}
                              disabled={disabled}
                              className="rounded-xl border border-border px-3 py-2 text-xs text-primary disabled:opacity-50"
                            >
                              忽略
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
