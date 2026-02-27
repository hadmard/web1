"use client";

import { useEffect, useState } from "react";

type SettingsState = {
  contentReviewRequired: boolean;
  memberDownloadStandardEnabled: boolean;
  memberDownloadReportEnabled: boolean;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        if (!res.ok) {
          setSettings(null);
          return;
        }
        const data = await res.json();
        setSettings({
          contentReviewRequired: data.contentReviewRequired !== false,
          memberDownloadStandardEnabled: data.memberDownloadStandardEnabled !== false,
          memberDownloadReportEnabled: data.memberDownloadReportEnabled !== false,
        });
      } catch {
        setSettings(null);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage("");

    const payload: Record<string, unknown> = {
      contentReviewRequired: settings.contentReviewRequired,
      memberDownloadStandardEnabled: settings.memberDownloadStandardEnabled,
      memberDownloadReportEnabled: settings.memberDownloadReportEnabled,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }
      setMessage("设置已保存");
    } catch {
      setMessage("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="text-sm text-muted">加载失败或无权限。</div>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <header>
        <h1 className="font-serif text-xl font-bold text-primary mb-2">系统设置</h1>
        <p className="text-sm text-muted">仅主管理员可访问。已移除过时的 AI 配置项，仅保留当前有效开关。</p>
      </header>

      <form onSubmit={handleSave} className="rounded-xl border border-border bg-surface-elevated p-6 space-y-4">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">启用内容审核（关闭后上传默认直接发布）</span>
          <input
            type="checkbox"
            checked={settings.contentReviewRequired}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, contentReviewRequired: e.target.checked } : prev
              )
            }
          />
        </label>

        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">个人会员可下载标准文件</span>
          <input
            type="checkbox"
            checked={settings.memberDownloadStandardEnabled}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, memberDownloadStandardEnabled: e.target.checked } : prev
              )
            }
          />
        </label>

        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">个人会员可下载行业报告</span>
          <input
            type="checkbox"
            checked={settings.memberDownloadReportEnabled}
            onChange={(e) =>
              setSettings((prev) =>
                prev ? { ...prev, memberDownloadReportEnabled: e.target.checked } : prev
              )
            }
          />
        </label>

        {message && <p className="text-xs text-accent">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-accent text-white text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
