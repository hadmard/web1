"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!token) {
      setError("缺少重置凭证，请重新发起找回密码。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "重置密码失败，请稍后重试。");
        return;
      }

      setSuccess("密码已重置，请使用新密码登录。");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/membership/login");
      }, 1200);
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 font-serif text-xl font-semibold tracking-tight text-primary">重置密码</h1>
      <p className="mb-6 text-sm text-muted">设置一个新的登录密码。重置链接默认 30 分钟内有效。</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
            新密码
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-muted">
            确认新密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded border border-border bg-surface-elevated px-4 py-2 text-primary hover:bg-surface disabled:opacity-50"
        >
          {loading ? "提交中..." : "确认重置密码"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted">
        <Link href="/membership/forgot-password" className="text-accent hover:underline">
          重新获取重置链接
        </Link>
      </p>
    </div>
  );
}
