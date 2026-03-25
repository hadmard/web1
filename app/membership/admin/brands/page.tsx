"use client";

import { useEffect, useMemo, useState } from "react";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  isRecommend: boolean;
  isBrandVisible: boolean;
  sortOrder: number;
  rankingWeight: number;
  displayTemplate: string | null;
  memberTypeSnapshot: string | null;
  region: string | null;
  area: string | null;
  enterprise: {
    id: string;
    companyName: string | null;
    companyShortName: string | null;
    memberId: string;
    member?: {
      memberType: string;
      rankingWeight: number;
    } | null;
  } | null;
};

type ApiResponse = {
  items: BrandRow[];
};

export default function AdminBrandsPage() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load(search = "") {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/brands?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "品牌列表加载失败");
      setLoading(false);
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isRecommend !== b.isRecommend) return a.isRecommend ? -1 : 1;
        if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
        if (a.rankingWeight !== b.rankingWeight) return b.rankingWeight - a.rankingWeight;
        return a.name.localeCompare(b.name, "zh-CN");
      }),
    [items]
  );

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
      setMessage(data.error ?? "品牌更新失败");
      setSavingId(null);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
    setSavingId(null);
    setMessage("品牌展示设置已更新");
  }

  if (loading) return <p className="text-muted">加载品牌展示设置中...</p>;

  return (
    <div className="max-w-7xl space-y-6">
      <header>
        <h1 className="font-serif text-xl font-bold text-primary">品牌展示管理</h1>
        <p className="mt-1 text-sm text-muted">
          这里管理 Enterprise 关联到 Brand 的前台展示层，包括推荐、排序、展示状态和模板。
        </p>
        {message ? <p className="mt-2 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void load(q);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm"
            placeholder="搜索品牌名、企业名、地区"
          />
          <button className="rounded bg-accent px-4 py-2 text-sm text-white">搜索</button>
          <button
            type="button"
            className="rounded border border-border px-4 py-2 text-sm text-primary hover:bg-surface"
            onClick={() => {
              setQ("");
              void load("");
            }}
          >
            重置
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-surface-elevated p-4">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3">品牌 / 企业</th>
              <th className="py-2 pr-3">绑定账号</th>
              <th className="py-2 pr-3">会员等级</th>
              <th className="py-2 pr-3">展示模板</th>
              <th className="py-2 pr-3">推荐</th>
              <th className="py-2 pr-3">显示</th>
              <th className="py-2 pr-3">排序</th>
              <th className="py-2 pr-3">权重</th>
              <th className="py-2 pr-3">区域</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const memberType = item.memberTypeSnapshot || item.enterprise?.member?.memberType || "enterprise_basic";
              const enterpriseName = item.enterprise?.companyShortName || item.enterprise?.companyName || "未绑定企业";
              const region = [item.region, item.area].filter(Boolean).join(" / ");

              return (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-3 align-top">
                    <div className="font-medium text-primary">{item.name}</div>
                    <div className="mt-1 text-xs text-muted">{enterpriseName}</div>
                    <div className="mt-1 text-xs text-muted">slug: {item.slug}</div>
                  </td>
                  <td className="py-3 pr-3 align-top text-muted">
                    {item.enterprise?.memberId ?? "未绑定"}
                  </td>
                  <td className="py-3 pr-3 align-top text-muted">{memberType}</td>
                  <td className="py-3 pr-3 align-top">
                    <select
                      value={item.displayTemplate ?? "brand_showcase"}
                      onChange={(event) => void updateBrand(item.id, { displayTemplate: event.target.value })}
                      className="rounded border border-border bg-surface px-2 py-1"
                      disabled={savingId === item.id}
                    >
                      <option value="brand_showcase">brand_showcase</option>
                      <option value="professional_service">professional_service</option>
                      <option value="simple_elegant">simple_elegant</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <input
                      type="checkbox"
                      checked={item.isRecommend}
                      onChange={(event) => void updateBrand(item.id, { isRecommend: event.target.checked })}
                      disabled={savingId === item.id}
                    />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <input
                      type="checkbox"
                      checked={item.isBrandVisible}
                      onChange={(event) => void updateBrand(item.id, { isBrandVisible: event.target.checked })}
                      disabled={savingId === item.id}
                    />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <input
                      type="number"
                      value={item.sortOrder}
                      onChange={(event) =>
                        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, sortOrder: Number(event.target.value) } : row)))
                      }
                      onBlur={(event) => void updateBrand(item.id, { sortOrder: Number(event.target.value) })}
                      className="w-24 rounded border border-border bg-surface px-2 py-1"
                      disabled={savingId === item.id}
                    />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <input
                      type="number"
                      value={item.rankingWeight}
                      onChange={(event) =>
                        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, rankingWeight: Number(event.target.value) } : row)))
                      }
                      onBlur={(event) => void updateBrand(item.id, { rankingWeight: Number(event.target.value) })}
                      className="w-24 rounded border border-border bg-surface px-2 py-1"
                      disabled={savingId === item.id}
                    />
                  </td>
                  <td className="py-3 pr-3 align-top text-muted">{region || "全国"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
