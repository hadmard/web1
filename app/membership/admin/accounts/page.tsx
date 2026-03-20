"use client";

import { useEffect, useMemo, useState } from "react";

type MemberRow = {
  id: string;
  account: string;
  name: string | null;
  role: string | null;
  memberType: string;
  canManageMembers: boolean;
  createdAt: string;
};

type AdminVisibleRow = {
  id: string;
  displayName: string;
  role: string | null;
  memberType: string;
};

export default function AdminAccountsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [visibleRows, setVisibleRows] = useState<AdminVisibleRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [myNewPassword, setMyNewPassword] = useState("");
  const [myNewPasswordConfirm, setMyNewPasswordConfirm] = useState("");

  const [newAccount, setNewAccount] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";

  async function load() {
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    if (!meRes.ok) {
      setLoading(false);
      return;
    }
    const me = await meRes.json();
    setRole(me.role ?? null);
    setCanManageMembers(me.canManageMembers === true);

    const res = await fetch("/api/admin/members", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (me.role === "SUPER_ADMIN") {
        setMembers(Array.isArray(data) ? data : []);
      } else {
        setVisibleRows(Array.isArray(data) ? data : []);
      }
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

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/members", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: newAccount.trim(),
        password: newPassword,
        name: newName.trim() || undefined,
        role: newRole,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "创建失败");
      return;
    }

    if (isSuperAdmin) {
      setMembers((prev) => [{ ...data, account: data.account ?? data.email ?? "" }, ...prev]);
    }
    setNewAccount("");
    setNewPassword("");
    setNewName("");
    setMessage(newRole === "ADMIN" ? "子管理员已创建" : "会员账号已创建");
  }

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
    setMessage("已更新");
  }

  async function removeMember(id: string) {
    if (!confirm("确认删除该账号？")) return;
    const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "删除失败");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setMessage("已删除");
  }

  async function changeMyPassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!currentPassword || !myNewPassword || !myNewPasswordConfirm) {
      setMessage("请完整填写修改密码信息");
      return;
    }
    if (myNewPassword !== myNewPasswordConfirm) {
      setMessage("两次输入的新密码不一致");
      return;
    }

    const res = await fetch("/api/auth/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword: myNewPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "修改密码失败");
      return;
    }

    setCurrentPassword("");
    setMyNewPassword("");
    setMyNewPasswordConfirm("");
    setMessage("我的密码已更新");
  }

  if (loading) return <p className="text-muted">加载中...</p>;

  if (!isSuperAdmin && !isAdmin) {
    return <p className="text-muted">需要管理员权限。</p>;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="font-serif text-xl font-bold text-primary">账号一览</h1>
        <p className="text-sm text-muted mt-1">
          {isSuperAdmin
            ? "用于创建/维护管理员与会员账号。权限开关已迁移到“权限管理”页面。"
            : canManageMembers
              ? "你可创建会员账号；如需权限调整请联系主管理员。"
              : "你当前无新增账号权限。"}
        </p>
        {message && <p className="text-sm text-accent mt-2">{message}</p>}
      </header>

      <section className="rounded-xl border border-border bg-surface-elevated p-4">
        <h2 className="text-sm font-medium text-primary mb-3">修改我的密码</h2>
        <form onSubmit={changeMyPassword} className="grid md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">旧密码</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="px-3 py-2 border border-border rounded bg-surface text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">新密码</span>
            <input
              type="password"
              value={myNewPassword}
              onChange={(e) => setMyNewPassword(e.target.value)}
              required
              minLength={6}
              className="px-3 py-2 border border-border rounded bg-surface text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">确认新密码</span>
            <input
              type="password"
              value={myNewPasswordConfirm}
              onChange={(e) => setMyNewPasswordConfirm(e.target.value)}
              required
              minLength={6}
              className="px-3 py-2 border border-border rounded bg-surface text-sm"
            />
          </label>
          <div>
            <button type="submit" className="px-4 py-2 rounded bg-accent text-white text-sm">
              修改我的密码
            </button>
          </div>
        </form>
      </section>

      {isAdmin && !canManageMembers && (
        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-sm font-medium text-primary mb-3">可见账号</h2>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-muted">暂无可见账号</p>
          ) : (
            <ul className="space-y-2">
              {visibleRows.map((row) => (
                <li key={row.id} className="text-sm text-primary border-b border-border pb-2 last:border-0">
                  {row.displayName}（{row.role === "ADMIN" ? "子管理员" : "会员"} / {row.memberType}）
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(isSuperAdmin || canManageMembers) && (
        <form onSubmit={addAccount} className="rounded-xl border border-border bg-surface-elevated p-4 grid md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">账号类型</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as "ADMIN" | "MEMBER")} className="px-3 py-2 border border-border rounded bg-surface text-sm" disabled={isAdmin}>
              <option value="MEMBER">会员</option>
              {isSuperAdmin && <option value="ADMIN">子管理员</option>}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">账号</span>
            <input value={newAccount} onChange={(e) => setNewAccount(e.target.value)} required className="px-3 py-2 border border-border rounded bg-surface text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">密码</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="px-3 py-2 border border-border rounded bg-surface text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">姓名（选填）</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="px-3 py-2 border border-border rounded bg-surface text-sm" />
          </label>
          <div className="md:col-span-4">
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">创建账号</button>
          </div>
        </form>
      )}

      {isSuperAdmin && (
        <section className="rounded-xl border border-border bg-surface-elevated p-4 overflow-x-auto">
          <h2 className="text-sm font-medium text-primary mb-3">账号列表</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">账号</th>
                <th className="text-left py-2">角色</th>
                <th className="text-left py-2">会员类型</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    <div className="text-primary">{m.account}</div>
                    <div className="text-xs text-muted">{m.name || "未命名"}</div>
                  </td>
                  <td className="py-2 pr-4 text-muted">{m.role === "SUPER_ADMIN" ? "主管理员" : m.role === "ADMIN" ? "子管理员" : "会员"}</td>
                  <td className="py-2 pr-4 text-muted">{m.memberType}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-3">
                      <button
                        className="apple-inline-link"
                        type="button"
                        onClick={() => {
                          const password = prompt("输入新密码（留空取消）");
                          if (!password) return;
                          updateMember(m.id, { password });
                        }}
                      >
                        修改密码
                      </button>
                      {m.role !== "SUPER_ADMIN" && (
                        <button className="text-xs text-red-600 hover:underline" type="button" onClick={() => removeMember(m.id)}>
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
