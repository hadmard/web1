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
        router.push("/membership/content");
      }
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-12">
      <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6">
        <section className="rounded-[28px] border border-[#e9dbc5] bg-[linear-gradient(145deg,rgba(251,247,240,0.98),rgba(244,235,220,0.9))] px-5 py-6 text-[#3d3126] shadow-[0_24px_70px_rgba(111,78,38,0.08)] sm:px-7 sm:py-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#9d7c54]">Member Access</p>
          <h1 className="mt-3 font-serif text-[2rem] leading-tight text-[#2f241a] sm:text-[2.5rem]">
            会员登录
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#6c5a46] sm:text-[15px]">
            登录后可统一管理内容发布、企业主页配置、图库素材与账号安全设置。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <FeatureCard title="内容管理" description="统一维护资讯、案例与图库素材。" />
            <FeatureCard title="品牌配置" description="集中更新主页视觉与企业资料。" />
            <FeatureCard title="移动友好" description="手机端也能顺畅完成日常操作。" />
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ece2d2] bg-white/96 px-5 py-6 shadow-[0_22px_64px_rgba(94,72,44,0.08)] sm:px-7 sm:py-8">
          <div className="mb-6 space-y-2">
            <h2 className="font-serif text-2xl text-[#2f241a]">进入会员系统</h2>
            <p className="text-sm leading-6 text-[#7a6650]">使用会员账号登录，继续管理企业内容与品牌展示。</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldLabel htmlFor="account" label="账号" />
            <input
              id="account"
              type="text"
              autoComplete="username"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
              placeholder="请输入登录账号"
              className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[15px] text-[#2f241a] outline-none transition focus:border-[#c9a46b] focus:bg-white"
            />

            <div className="space-y-2">
              <FieldLabel htmlFor="password" label="密码" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[15px] text-[#2f241a] outline-none transition focus:border-[#c9a46b] focus:bg-white"
              />
              <div className="text-right">
                <Link href="/membership/forgot-password" className="text-xs text-[#9d7c54] transition hover:text-[#7f6542]">
                  忘记密码？
                </Link>
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-[#f1d4d4] bg-[#fff6f6] px-4 py-3 text-sm text-[#b84c4c]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#a27d4f] px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-[#8e6b42] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <p className="mt-5 text-sm text-[#7a6650]">
            还没有账号？
            <Link href="/membership/register" className="ml-2 text-[#9d7c54] transition hover:text-[#7f6542]">
              去注册
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[#5b4a39]">
      {label}
    </label>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-white/60 bg-white/58 px-4 py-4 backdrop-blur">
      <p className="text-sm font-medium text-[#3b2f24]">{title}</p>
      <p className="mt-2 text-xs leading-6 text-[#7a6650]">{description}</p>
    </div>
  );
}
