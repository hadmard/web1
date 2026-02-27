"use client";

import { useState } from "react";

type Props = {
  resourceType: "standard" | "report";
  resourceId: string;
  allowed: boolean;
  reason?: string;
};

export function MemberDownloadButton({ resourceType, resourceId, allowed, reason }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    if (!allowed) return;
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/member/download", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "下载失败");
        return;
      }
      setMessage(data.message ?? "下载请求已提交");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!allowed || submitting}
        className="text-sm px-3 py-2 rounded border border-border hover:bg-surface disabled:opacity-50"
      >
        {submitting ? "处理中..." : "下载"}
      </button>
      <p className="text-xs text-muted">{message || (!allowed ? reason ?? "无下载权限" : "")}</p>
    </div>
  );
}
