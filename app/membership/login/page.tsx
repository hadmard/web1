"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: account.trim(), password }),
      });

      const text = await res.text();
      let data: { role?: string | null; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error ?? "登录失败，请检查账号或密码");
        return;
      }

      const role = data.role;
      if (role === "SUPER_ADMIN" || role === "ADMIN") {
        router.push("/membership/admin");
      } else {
        router.push("/membership/content/publish?tab=articles");
      }
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="font-serif text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-6">
        会员登录
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="account" className="block text-sm font-medium text-[var(--color-muted)] mb-1">
            账号
          </label>
          <input
            id="account"
            type="text"
            autoComplete="username"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            placeholder="请输入登录账号"
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--color-muted)] mb-1">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-gray-900 dark:text-gray-100"
          />
          <div className="mt-2 text-right">
            <Link href="/membership/forgot-password" className="text-xs text-accent hover:underline">
              忘记密码？
            </Link>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded border border-[var(--color-border)] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>

      </form>

      <p className="mt-5 text-sm text-muted">
        还没有账号？
        <Link href="/membership/register" className="ml-2 text-accent hover:underline">
          去注册
        </Link>
      </p>
    </div>
  );
}
