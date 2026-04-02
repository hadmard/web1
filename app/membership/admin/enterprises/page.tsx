"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type EnterpriseRow = {
  id: string;
  memberId: string;
  companyName: string | null;
  companyShortName: string | null;
  productSystem: string | null;
  region: string | null;
  area: string | null;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    name: string | null;
    email: string;
    memberType: string;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    isBrandVisible: boolean;
  } | null;
};

type ApiResponse = {
  items: EnterpriseRow[];
  total: number;
};

function displayEnterpriseName(item: EnterpriseRow) {
  return item.companyShortName || item.companyName || item.member.name || item.member.email;
}

function memberTypeLabel(value: string) {
  if (value === "enterprise_advanced") return "VIP 企业";
  if (value === "enterprise_basic") return "基础企业";
  return value;
}

function verificationLabel(value: string) {
  if (value === "approved") return "已审核";
  if (value === "pending") return "待审核";
  if (value === "rejected") return "已驳回";
  return value;
}

export default function AdminEnterprisesPage() {
  const [items, setItems] = useState<EnterpriseRow[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [brandBinding, setBrandBinding] = useState<"all" | "bound" | "unbound">("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const hasFilters = search.trim().length > 0 || brandBinding !== "all";

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({ limit: "200" });
    if (search.trim()) params.set("q", search.trim());
    if (brandBinding !== "all") params.set("brandBinding", brandBinding);

    const res = await fetch(`/api/admin/enterprises?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { error?: string };

    if (!res.ok) {
      setItems([]);
      setMessage(data.error ?? "企业列表加载失败");
      setLoading(false);
      return;
    }

    setItems(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  }, [brandBinding, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBrandFromEnterprise(item: EnterpriseRow) {
    if (creatingId) return;

    setCreatingId(item.id);
    setMessage("");

    const res = await fetch(`/api/admin/enterprises/${item.id}/brand`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      brandId?: string;
      existing?: boolean;
      message?: string;
    };

    if (!res.ok) {
      setMessage(data.error ?? "设为品牌失败");
      setCreatingId(null);
      return;
    }

    setMessage(data.message ?? "品牌创建成功");

    if (data.brandId) {
      window.location.href = `/membership/admin/brands/${data.brandId}`;
      return;
    }

    setMessage(data.message ?? "已处理完成");
    setCreatingId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Enterprise Management</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-primary">企业管理</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
              所有企业先进入企业池，再决定是否进入品牌展示位。这里可以查看企业主页、维护资料入口，并一键设为品牌。
            </p>
          </div>
          <Link
            href="/membership/admin/brands/create"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            创建品牌
          </Link>
        </div>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[24px] border border-[rgba(181,157,121,0.16)] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
        <form
          className="grid gap-3 md:grid-cols-[1fr,220px,auto,auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(q);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="h-12 rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
            placeholder="搜索企业名称、会员账号、地区、品类"
          />
          <select
            value={brandBinding}
            onChange={(event) => setBrandBinding(event.target.value as "all" | "bound" | "unbound")}
            className="h-12 rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
          >
            <option value="all">全部企业</option>
            <option value="bound">已绑定品牌</option>
            <option value="unbound">未绑定品牌</option>
          </select>
          <button className="h-12 rounded-[16px] bg-accent px-5 text-sm font-medium text-white">搜索</button>
          <button
            type="button"
            className="h-12 rounded-[16px] border border-border px-5 text-sm text-primary transition hover:bg-surface"
            onClick={() => {
              setQ("");
              setSearch("");
              setBrandBinding("all");
            }}
          >
            重置
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="hidden border-b border-border px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted lg:grid lg:grid-cols-[minmax(0,1.5fr)_120px_140px_140px_140px_210px] lg:gap-4">
          <span>企业</span>
          <span>地区 / 品类</span>
          <span>会员类型</span>
          <span>状态</span>
          <span>品牌绑定</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted">加载企业列表中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-muted">{hasFilters ? "当前筛选条件下没有匹配的企业。" : "当前还没有企业数据。"}</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <article key={item.id} className="px-5 py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_120px_140px_140px_140px_210px] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-primary">{displayEnterpriseName(item)}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {item.companyName && item.companyName !== item.companyShortName ? item.companyName : item.member.email}
                    </p>
                  </div>

                  <div className="text-sm text-primary">
                    <p>{item.region || "全国"}</p>
                    <p className="text-xs text-muted">{item.productSystem || item.area || "资料待补充"}</p>
                  </div>

                  <div className="text-sm text-primary">{memberTypeLabel(item.member.memberType)}</div>
                  <div className="text-sm text-primary">{verificationLabel(item.verificationStatus)}</div>

                  <div className="text-sm text-primary">
                    {item.brand ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">已绑定</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">未绑定</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <Link href={`/enterprise/${item.id}`} className="text-accent hover:underline" target="_blank">
                      查看
                    </Link>
                    <Link href={`/membership/admin/enterprises/${item.id}`} className="text-accent hover:underline">
                      编辑
                    </Link>
                    {item.brand ? (
                      <Link href={`/membership/admin/brands/${item.brand.id}`} className="text-accent hover:underline">
                        编辑品牌
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={creatingId === item.id}
                        className="text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void createBrandFromEnterprise(item)}
                      >
                        {creatingId === item.id ? "创建中..." : "设为品牌"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
