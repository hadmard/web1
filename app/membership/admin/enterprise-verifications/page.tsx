"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VerificationCard } from "@/app/membership/admin/enterprise-verifications/components/VerificationCard";
import { VerificationFilters } from "@/app/membership/admin/enterprise-verifications/components/VerificationFilters";

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

export default function AdminEnterpriseVerificationPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("pending");
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
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
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);

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
    setMessage(action === "approve" ? "审核通过并已生成企业页。" : "认证申请已驳回。");
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

      <VerificationFilters statusFilter={statusFilter} onChange={setStatusFilter} />

      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-5 text-sm text-muted">暂无认证申请</div>
        ) : (
          items.map((item) => (
            <VerificationCard
              key={item.id}
              item={item}
              reviewText={reviewNote[item.id] ?? ""}
              saving={savingId === item.id}
              onReviewTextChange={(value) => setReviewNote((prev) => ({ ...prev, [item.id]: value }))}
              onReview={(action) => void review(item.id, action)}
            />
          ))
        )}
      </section>
    </div>
  );
}
