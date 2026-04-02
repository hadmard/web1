"use client";

import { useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type ImportResponse = {
  listUrl: string;
  scanned: number;
  imported: Array<{ id?: string; url: string; title: string; subHref: string }>;
  skipped: Array<{ url: string; reason: string }>;
  failed: Array<{ url: string; reason: string }>;
};

type RequestSnapshot = {
  listUrl: string;
  sourceName: string;
  includePatterns: string[];
  limit: number;
  dryRun: boolean;
};

const DEFAULT_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 20000;

function parseIncludePatterns(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminNewsImportPage() {
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [listUrl, setListUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [includePatternsText, setIncludePatternsText] = useState("/news/");
  const [limitText, setLimitText] = useState(String(DEFAULT_LIMIT));
  const [dryRunChecked, setDryRunChecked] = useState(true);

  const [submittingMode, setSubmittingMode] = useState<"dryRun" | "import" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestSnapshot, setRequestSnapshot] = useState<RequestSnapshot | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          setRole(null);
          return;
        }
        const me = await res.json();
        setRole(me.role ?? null);
      } catch {
        setRole(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const canAccess = role === "SUPER_ADMIN" || role === "ADMIN";
  const includePatterns = useMemo(() => parseIncludePatterns(includePatternsText), [includePatternsText]);

  async function submitImport(mode: "dryRun" | "import") {
    const trimmedListUrl = listUrl.trim();
    const trimmedSourceName = sourceName.trim();
    const parsedLimit = Number(limitText);
    const finalLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(30, Math.floor(parsedLimit)) : DEFAULT_LIMIT;

    if (!trimmedListUrl) {
      setError("请输入列表页 URL");
      setMessage("");
      return;
    }

    if (!trimmedSourceName) {
      setError("请输入来源名称");
      setMessage("");
      return;
    }

    setSubmittingMode(mode);
    setError("");
    setMessage("");
    setResult(null);

    const snapshot: RequestSnapshot = {
      listUrl: trimmedListUrl,
      sourceName: trimmedSourceName,
      includePatterns,
      limit: finalLimit,
      dryRun: mode === "dryRun" ? true : dryRunChecked,
    };
    setRequestSnapshot(snapshot);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/admin/news-import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setError(data?.error ?? "抓取请求失败");
        return;
      }

      setResult(data as ImportResponse);
      setMessage(mode === "dryRun" ? "试跑完成，可查看本次抓取结果。" : "抓取执行完成，已返回本次入库结果。");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("请求超时，请稍后重试。");
        return;
      }
      setError("网络异常，请稍后重试。");
    } finally {
      window.clearTimeout(timer);
      setSubmittingMode(null);
    }
  }

  if (authLoading) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted">权限加载中...</div>;
  }

  if (!canAccess) {
    return <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm text-muted">需要管理员权限。</div>;
  }

  return (
    <div className="space-y-6">
      <InlinePageBackLink href="/membership/admin" label="返回后台首页" />

      <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">新闻抓取</p>
        <h1 className="mt-3 font-serif text-3xl text-primary">后台抓取入口</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          这里仅作为现有管理员抓取接口的可视化触发入口。抓取结果仍按现有规则写入，状态固定为 pending，不会绕过审核。
        </p>
      </section>

      <section className="rounded-[24px] border border-border bg-surface-elevated p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-primary">列表页 URL</span>
            <input
              className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary outline-none transition focus:border-[rgba(180,154,107,0.42)]"
              value={listUrl}
              onChange={(e) => setListUrl(e.target.value)}
              placeholder="https://example.com/news"
              inputMode="url"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-primary">来源名称</span>
            <input
              className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary outline-none transition focus:border-[rgba(180,154,107,0.42)]"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="如：XX媒体"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-primary">includePatterns</span>
            <textarea
              className="min-h-[96px] w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition focus:border-[rgba(180,154,107,0.42)]"
              value={includePatternsText}
              onChange={(e) => setIncludePatternsText(e.target.value)}
              placeholder="可输入 /news/，支持逗号或换行分隔多个规则"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-primary">limit</span>
            <input
              className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary outline-none transition focus:border-[rgba(180,154,107,0.42)]"
              value={limitText}
              onChange={(e) => setLimitText(e.target.value)}
              placeholder="10"
              inputMode="numeric"
            />
          </label>

          <label className="flex items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgba(138,115,77,0.95)]"
              checked={dryRunChecked}
              onChange={(e) => setDryRunChecked(e.target.checked)}
            />
            <span className="text-sm text-muted">勾选后可把“执行抓取”也按 dryRun 方式发送；“试跑”按钮始终使用 dryRun。</span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => submitImport("dryRun")}
            disabled={submittingMode !== null}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingMode === "dryRun" ? "试跑中..." : "试跑（dryRun）"}
          </button>
          <button
            type="button"
            onClick={() => submitImport("import")}
            disabled={submittingMode !== null}
            className="rounded-full bg-[linear-gradient(180deg,rgba(196,174,129,0.95),rgba(138,115,77,0.96))] px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_28px_-20px_rgba(138,115,77,0.65)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingMode === "import" ? "执行中..." : "执行抓取"}
          </button>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-[rgba(143,155,116,0.28)] bg-[rgba(143,155,116,0.08)] px-4 py-3 text-sm text-primary">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] px-4 py-3 text-sm text-[rgb(153,27,27)]">{error}</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <h2 className="text-lg font-semibold text-primary">请求摘要</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <div className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">列表页 URL</p>
              <p className="mt-2 break-all text-primary">{requestSnapshot?.listUrl || "-"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">来源名称</p>
              <p className="mt-2 text-primary">{requestSnapshot?.sourceName || "-"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">includePatterns</p>
              <p className="mt-2 break-all text-primary">{requestSnapshot ? (requestSnapshot.includePatterns.join(", ") || "未填写") : "-"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">limit / dryRun</p>
              <p className="mt-2 text-primary">{requestSnapshot ? `${requestSnapshot.limit} / ${requestSnapshot.dryRun ? "true" : "false"}` : "-"}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-border bg-surface-elevated p-5">
          <h2 className="text-lg font-semibold text-primary">执行结果</h2>
          {!result ? (
            <p className="mt-4 text-sm text-muted">提交后会在这里显示 scanned、imported、skipped、failed 等结果。</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "扫描链接", value: result.scanned },
                  { label: "导入成功", value: result.imported.length },
                  { label: "跳过", value: result.skipped.length },
                  { label: "失败", value: result.failed.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-primary">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-[rgba(255,252,247,0.76)] p-4">
                <p className="text-sm font-medium text-primary">接口返回</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-muted">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
