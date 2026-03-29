"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");
  const [needsRecoveryRequest, setNeedsRecoveryRequest] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    setDebugResetUrl("");
    setNeedsRecoveryRequest(false);
    setRequestMessage("");

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "发送重置说明失败，请稍后重试。");
        setNeedsRecoveryRequest(data.needsRecoveryRequest === true);
        return;
      }

      setMessage(data.message ?? "如果账号存在且已配置找回邮箱，系统会发送密码重置说明。");
      if (typeof data.debugResetUrl === "string" && data.debugResetUrl.trim()) {
        setDebugResetUrl(data.debugResetUrl.trim());
      }
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function submitRecoveryRequest() {
    if (requesting || !account.trim()) return;
    setRequesting(true);
    setRequestMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password/recovery-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          requestNote,
          contactInfo,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "提交找回申请失败，请稍后重试。");
        return;
      }
      setRequestMessage(data.message ?? "找回申请已提交，请等待管理员处理。");
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 font-serif text-xl font-semibold tracking-tight text-primary">找回密码</h1>
      <p className="mb-6 text-sm text-muted">输入账号后，系统会优先发送重置邮件；若旧账号未绑定找回邮箱，也可直接提交人工找回申请。</p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {debugResetUrl ? (
          <p className="break-all text-xs text-muted">
            开发环境重置链接：
            <a href={debugResetUrl} className="ml-1 text-accent hover:underline">
              {debugResetUrl}
            </a>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded border border-border bg-surface-elevated px-4 py-2 text-primary hover:bg-surface disabled:opacity-50"
        >
          {loading ? "发送中..." : "发送重置说明"}
        </button>
      </form>

      {needsRecoveryRequest ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-sm font-medium text-primary">人工找回申请</h2>
          <p className="mt-1 text-xs text-muted">适用于旧账号未绑定找回邮箱的情况。提交后，管理员可在后台“密码找回申请”中直接处理。</p>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">情况说明</span>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                rows={4}
                placeholder="可填写企业名称、品牌名称、账号用途或当前遇到的问题"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">联系方式</span>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="手机号、微信或可联系到你的方式"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-primary"
              />
            </label>
            {requestMessage ? <p className="text-sm text-emerald-700">{requestMessage}</p> : null}
            <button
              type="button"
              disabled={requesting}
              onClick={() => void submitRecoveryRequest()}
              className="w-full rounded bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {requesting ? "提交中..." : "提交人工找回申请"}
            </button>
          </div>
        </section>
      ) : null}

      <p className="mt-5 text-sm text-muted">
        想起密码了？
        <Link href="/membership/login" className="ml-2 text-accent hover:underline">
          返回登录
        </Link>
      </p>
    </div>
  );
}
