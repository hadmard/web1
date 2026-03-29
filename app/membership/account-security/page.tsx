"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function AccountSecurityPage() {
  const [account, setAccount] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/recovery-email", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      setAccount(typeof data.account === "string" ? data.account : "");
      setRecoveryEmail(typeof data.recoveryEmail === "string" ? data.recoveryEmail : "");
    })();
  }, []);

  async function handleRecoveryEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingRecovery) return;

    setLoadingRecovery(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/recovery-email", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "保存找回邮箱失败。");
        return;
      }
      setRecoveryEmail(typeof data.recoveryEmail === "string" ? data.recoveryEmail : "");
      setMessage(data.recoveryEmail ? "找回邮箱已保存。" : "找回邮箱已清空。");
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoadingRecovery(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingPassword) return;

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "修改密码失败。");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("密码已更新。");
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoadingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">账号安全</span>
      </nav>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <h1 className="font-serif text-3xl font-semibold text-primary">账号安全</h1>
          <p className="mt-3 text-sm text-muted">建议先保存找回邮箱，再在需要时通过邮箱完成密码重置。</p>
          {account ? <p className="mt-2 text-sm text-muted">当前账号：{account}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        </section>

        <section className="rounded-[24px] border border-border bg-white/90 p-6">
          <h2 className="text-lg font-semibold text-primary">找回邮箱</h2>
          <p className="mt-2 text-sm text-muted">忘记密码时，系统会把重置链接发送到这里。</p>
          <form onSubmit={handleRecoveryEmailSubmit} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">邮箱地址</span>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="name@example.com"
                className="rounded border border-border bg-surface px-3 py-2 text-primary"
              />
            </label>
            <button
              type="submit"
              disabled={loadingRecovery}
              className="rounded bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {loadingRecovery ? "保存中..." : "保存找回邮箱"}
            </button>
          </form>
        </section>

        <section className="rounded-[24px] border border-border bg-white/90 p-6">
          <h2 className="text-lg font-semibold text-primary">修改密码</h2>
          <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">当前密码</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="rounded border border-border bg-surface px-3 py-2 text-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">新密码</span>
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="rounded border border-border bg-surface px-3 py-2 text-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">确认新密码</span>
              <input
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="rounded border border-border bg-surface px-3 py-2 text-primary"
              />
            </label>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loadingPassword}
                className="rounded bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {loadingPassword ? "提交中..." : "更新密码"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
