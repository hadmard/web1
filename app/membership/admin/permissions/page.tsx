"use client";

import { useEffect, useMemo, useState } from "react";

type MemberRow = {
  id: string;
  account: string;
  name: string | null;
  role: string | null;
  memberType: string;
  canPublishWithoutReview: boolean;
  canManageMembers: boolean;
  canDeleteOwnContent: boolean;
  canDeleteMemberContent: boolean;
  canDeleteAllContent: boolean;
  canEditOwnContent: boolean;
  canEditMemberContent: boolean;
  canEditAllContent: boolean;
  createdAt: string;
};

export default function AdminPermissionsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = role === "SUPER_ADMIN";

  async function load() {
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!meRes.ok) {
      setLoading(false);
      return;
    }
    const me = await meRes.json();
    setRole(me.role ?? null);

    if (me.role !== "SUPER_ADMIN") {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/members", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [members]
  );

  async function updateMember(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "更新失败");
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...data, account: data.account ?? data.email ?? m.account } : m)));
    setMessage("权限已更新");
  }

  if (loading) return <p className="text-muted">加载中...</p>;

  if (!isSuperAdmin) {
    return <p className="text-muted">此页面仅主管理员可见。</p>;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="font-serif text-xl font-bold text-primary">权限管理</h1>
        <p className="text-sm text-muted mt-1">
          仅主管理员可操作。用于分配账号的内容权限，避免误删和越权修改。
        </p>
        {message && <p className="text-sm text-accent mt-2">{message}</p>}
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-4 text-sm text-muted space-y-1">
        <p>功能说明：</p>
        <p>1. `添加会员`：允许子管理员创建会员账号。</p>
        <p>1.1 `发布免审`：开启后，该账号新增内容可直接发布（无需审核）。</p>
        <p>2. `改自己/改会员/改全部`：直接修改内容的范围权限。</p>
        <p>3. `删自己/删会员/删全部`：直接删除内容的范围权限。</p>
        <p>4. 未开通修改权限时，子管理员和会员只能提交“修改申请”走审核。</p>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">账号</th>
                <th className="text-left py-2">角色</th>
                <th className="text-left py-2">发布免审</th>
                <th className="text-left py-2">添加会员</th>
              <th className="text-left py-2">改自己</th>
              <th className="text-left py-2">改会员</th>
              <th className="text-left py-2">改全部</th>
              <th className="text-left py-2">删自己</th>
              <th className="text-left py-2">删会员</th>
              <th className="text-left py-2">删全部</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">
                  <div className="text-primary">{m.account}</div>
                  <div className="text-xs text-muted">{m.name || "未命名"}</div>
                </td>
                <td className="py-2 pr-4 text-muted">
                  {m.role === "SUPER_ADMIN" ? "主管理员" : m.role === "ADMIN" ? "子管理员" : "会员"}
                </td>
                <td className="py-2 pr-4"><Toggle checked={m.canPublishWithoutReview} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canPublishWithoutReview: !m.canPublishWithoutReview })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canManageMembers} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canManageMembers: !m.canManageMembers })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canEditOwnContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canEditOwnContent: !m.canEditOwnContent })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canEditMemberContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canEditMemberContent: !m.canEditMemberContent })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canEditAllContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canEditAllContent: !m.canEditAllContent })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canDeleteOwnContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canDeleteOwnContent: !m.canDeleteOwnContent })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canDeleteMemberContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canDeleteMemberContent: !m.canDeleteMemberContent })} /></td>
                <td className="py-2 pr-4"><Toggle checked={m.canDeleteAllContent} disabled={m.role === "SUPER_ADMIN"} onClick={() => updateMember(m.id, { canDeleteAllContent: !m.canDeleteAllContent })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Toggle({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded border ${checked ? "border-green-600 text-green-700" : "border-border text-muted"} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface"}`}
    >
      {checked ? "开" : "关"}
    </button>
  );
}
