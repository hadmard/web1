"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          account: account.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "注册失败，请稍后重试");
        return;
      }

      router.push("/membership/content/publish?tab=articles");
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="mb-2 font-serif text-xl font-semibold tracking-tight text-primary">会员注册</h1>
      <p className="mb-6 text-sm text-muted">
        先注册普通会员账号，后续可通过企业认证升级为企业基础会员，再由后台升级为企业 VIP 会员。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-muted">
            名称
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称或联系人姓名"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        <div>
          <label htmlFor="account" className="mb-1 block text-sm font-medium text-muted">
            账号
          </label>
          <input
            id="account"
            type="text"
            autoComplete="username"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            placeholder="至少 4 位，仅支持小写字母/数字/._-"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
            密码
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-muted">
            确认密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded border border-border bg-surface-elevated px-4 py-2 text-primary hover:bg-surface disabled:opacity-50"
        >
          {loading ? "注册中..." : "注册并进入会员系统"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted">
        已有账号？
        <Link href="/membership/login" className="ml-2 text-accent hover:underline">
          去登录
        </Link>
      </p>
    </div>
  );
}
