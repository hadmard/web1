"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Status = "pending" | "approved" | "rejected";

type VerificationItem = {
  id: string;
  companyName: string;
  companyShortName?: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string | null;
  logoUrl?: string | null;
  licenseImageUrl: string;
  licenseCode: string;
  address: string;
  website?: string | null;
  intro?: string | null;
  businessScope?: string | null;
  productSystem?: string | null;
  coreAdvantages?: string | null;
  status: Status;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedEnterpriseId?: string | null;
  member: {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
    memberType: string;
  };
};

function statusText(status: Status) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  return "待审核";
}

export default function AdminEnterpriseVerificationPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("pending");
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const meRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    if (!meRes.ok) {
      setRole(null);
      setLoading(false);
      return;
    }
    const me = await meRes.json();
    setRole(me.role ?? null);

    if (me.role !== "SUPER_ADMIN") {
      setLoading(false);
      return;
    }

    const sp = new URLSearchParams({ limit: "200" });
    if (statusFilter) sp.set("status", statusFilter);
    const res = await fetch(`/api/admin/enterprise-verifications?${sp.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    setItems(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const pendingCount = useMemo(() => items.filter((x) => x.status === "pending").length, [items]);

  async function review(id: string, action: "approve" | "reject") {
    setSavingId(id);
    const res = await fetch(`/api/admin/enterprise-verifications/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reviewNote: reviewNote[id] ?? "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "审核失败");
      setSavingId(null);
      return;
    }
    setMessage(action === "approve" ? "已审核通过并生成企业页。" : "已驳回认证申请。");
    await load();
    setSavingId(null);
  }

  if (loading) return <p className="text-muted">加载中...</p>;
  if (role !== "SUPER_ADMIN") return <p className="text-muted">仅主管理员可访问。</p>;

  return (
    <div className="max-w-6xl space-y-6">
      <header className="rounded-xl border border-border bg-surface-elevated p-5">
        <h1 className="font-serif text-2xl font-bold text-primary">企业认证审核</h1>
        <p className="text-sm text-muted mt-1">待审核数量：{pendingCount}</p>
        {message && <p className="text-sm text-accent mt-2">{message}</p>}
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "pending", label: "待审核" },
            { key: "approved", label: "已通过" },
            { key: "rejected", label: "已驳回" },
            { key: "", label: "全部" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setStatusFilter(item.key as "" | Status)}
              className={`px-3 py-1.5 rounded border text-sm ${
                statusFilter === item.key ? "bg-accent text-white border-accent" : "border-border hover:bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-5 text-sm text-muted">暂无认证申请</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{item.companyName}</h2>
                  <p className="text-xs text-muted">
                    提交账号：{item.member.name || item.member.email} / {item.member.memberType}
                  </p>
                </div>
                <p className="text-sm text-primary">{statusText(item.status)}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <Info label="企业简称" value={item.companyShortName} />
                <Info label="联系人" value={item.contactPerson} />
                <Info label="联系电话" value={item.contactPhone} />
                <Info label="联系邮箱" value={item.contactEmail} />
                <Info label="信用代码" value={item.licenseCode} />
                <Info label="企业地址" value={item.address} />
                <Info label="官网" value={item.website} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">企业 Logo</p>
                  {item.logoUrl ? (
                    <img src={item.logoUrl} alt="logo" className="h-20 w-20 object-cover rounded border border-border" />
                  ) : (
                    <p className="text-xs text-muted">未上传</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">营业执照</p>
                  <img
                    src={item.licenseImageUrl}
                    alt="license"
                    className="h-28 w-auto object-contain rounded border border-border bg-white"
                  />
                </div>
              </div>

              {(item.intro || item.businessScope || item.productSystem || item.coreAdvantages) && (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <Info label="企业介绍" value={item.intro} multiline />
                  <Info label="经营范围" value={item.businessScope} multiline />
                  <Info label="产品体系" value={item.productSystem} multiline />
                  <Info label="核心优势" value={item.coreAdvantages} multiline />
                </div>
              )}

              {item.status === "approved" && item.approvedEnterpriseId && (
                <Link href={`/enterprise/${item.approvedEnterpriseId}`} className="inline-flex text-sm text-accent hover:underline">
                  查看生成后的企业详情页
                </Link>
              )}

              {item.status === "pending" && (
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-xs text-muted">审核意见（可选）</span>
                    <textarea
                      className="mt-1 w-full min-h-20 px-3 py-2 border border-border rounded bg-surface text-sm"
                      value={reviewNote[item.id] ?? ""}
                      onChange={(e) => setReviewNote((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => void review(item.id, "approve")}
                      className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50"
                    >
                      通过并生成详情页
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => void review(item.id, "reject")}
                      className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                    >
                      驳回
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-primary ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}
