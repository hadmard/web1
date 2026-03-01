"use client";

import { useEffect, useState } from "react";
import {
  BACKGROUND_IMAGE_FIELDS,
  DEFAULT_SITE_VISUAL_SETTINGS,
  HOME_AD_FIELDS,
  normalizeSiteVisualSettings,
  type BackgroundImageKey,
  type HomeAdKey,
  type SiteVisualSettings,
} from "@/lib/site-visual-config";

type SettingsState = {
  contentReviewRequired: boolean;
  memberDownloadStandardEnabled: boolean;
  memberDownloadReportEnabled: boolean;
  siteVisualSettings: SiteVisualSettings;
};

type CategoryState = {
  id: string;
  href: string;
  title: string;
  desc: string;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [settingRes, categoryRes] = await Promise.all([
          fetch("/api/admin/settings", { credentials: "include" }),
          fetch("/api/admin/categories", { credentials: "include" }),
        ]);

          if (settingRes.ok) {
            const data = await settingRes.json();
            setSettings({
              contentReviewRequired: data.contentReviewRequired !== false,
              memberDownloadStandardEnabled: data.memberDownloadStandardEnabled !== false,
              memberDownloadReportEnabled: data.memberDownloadReportEnabled !== false,
              siteVisualSettings: normalizeSiteVisualSettings(data.siteVisualSettings),
            });
          } else {
            setSettings(null);
          }

        if (categoryRes.ok) {
          const data = (await categoryRes.json()) as Array<{
            id: string;
            href: string;
            title: string;
            desc: string | null;
          }>;
          setCategories(
            data
              .map((item) => ({
                id: item.id,
                href: item.href,
                title: item.title ?? "",
                desc: item.desc ?? "",
              }))
              .sort((a, b) => a.href.localeCompare(b.href, "zh-CN"))
          );
        } else {
          setCategories([]);
        }
      } catch {
        setSettings(null);
        setCategories([]);
      } finally {
        setCategoryLoading(false);
      }
    })();
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage("");

    const payload: Record<string, unknown> = {
      contentReviewRequired: settings.contentReviewRequired,
      memberDownloadStandardEnabled: settings.memberDownloadStandardEnabled,
      memberDownloadReportEnabled: settings.memberDownloadReportEnabled,
      siteVisualSettings: settings.siteVisualSettings,
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

  function updateCategoryField(id: string, key: "title" | "desc", value: string) {
    setCategories((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  function updateBackgroundField(key: BackgroundImageKey, value: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        siteVisualSettings: {
          ...prev.siteVisualSettings,
          backgrounds: {
            ...prev.siteVisualSettings.backgrounds,
            [key]: value,
          },
        },
      };
    });
  }

  function updateAdField(key: HomeAdKey, field: keyof SiteVisualSettings["ads"][HomeAdKey], value: string | boolean) {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev.siteVisualSettings.ads[key] ?? DEFAULT_SITE_VISUAL_SETTINGS.ads[key];
      return {
        ...prev,
        siteVisualSettings: {
          ...prev.siteVisualSettings,
          ads: {
            ...prev.siteVisualSettings.ads,
            [key]: {
              ...current,
              [field]: value,
            },
          },
        },
      };
    });
  }

  async function handleSaveCategory(id: string) {
    const target = categories.find((item) => item.id === id);
    if (!target) return;

    setSavingCategoryId(id);
    setCategoryMessage("");

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title.trim(),
          desc: target.desc.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryMessage(data.error ?? `保存失败：${target.href}`);
        return;
      }

      setCategories((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: (data.title ?? item.title) as string,
                desc: ((data.desc ?? item.desc) as string | null) ?? "",
              }
            : item
        )
      );
      setCategoryMessage(`栏目已保存：${target.href}`);
    } catch {
      setCategoryMessage("网络错误，请稍后重试");
    } finally {
      setSavingCategoryId(null);
    }
  }

  if (!settings) {
    return <div className="text-sm text-muted">加载失败或无权限。</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-serif text-xl font-bold text-primary mb-2">系统设置</h1>
        <p className="text-sm text-muted">仅主管理员可访问。</p>
      </header>

      <form onSubmit={handleSaveSettings} className="rounded-xl border border-border bg-surface-elevated p-6 space-y-4">
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

        <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
          <header>
            <h2 className="font-serif text-base font-semibold text-primary">背景图与广告位（仅主管理员）</h2>
            <p className="text-xs text-muted mt-1">所有背景图均可在此修改。每项已标注建议尺寸（像素）。</p>
          </header>

          <div className="space-y-3">
            {BACKGROUND_IMAGE_FIELDS.map((field) => (
              <div key={field.key} className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="text-sm text-primary">{field.label}</label>
                  <span className="text-[11px] text-muted">建议尺寸：{field.requiredSize}</span>
                </div>
                <input
                  value={settings.siteVisualSettings.backgrounds[field.key]}
                  onChange={(e) => updateBackgroundField(field.key, e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                  placeholder="请输入图片 URL（如 /images/xxx.jpg）"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {HOME_AD_FIELDS.map((field) => {
              const ad = settings.siteVisualSettings.ads[field.key] ?? DEFAULT_SITE_VISUAL_SETTINGS.ads[field.key];
              return (
                <article key={field.key} className="rounded-lg border border-border bg-surface-elevated p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-primary">{field.label}</p>
                    <span className="text-[11px] text-muted">建议尺寸：{field.requiredSize}</span>
                  </div>

                  <label className="flex items-center justify-between gap-3 text-xs text-muted">
                    <span>启用广告位</span>
                    <input
                      type="checkbox"
                      checked={ad.enabled}
                      onChange={(e) => updateAdField(field.key, "enabled", e.target.checked)}
                    />
                  </label>

                  <input
                    value={ad.title}
                    onChange={(e) => updateAdField(field.key, "title", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                    placeholder="广告位标题"
                  />
                  <input
                    value={ad.imageUrl}
                    onChange={(e) => updateAdField(field.key, "imageUrl", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                    placeholder="广告图片 URL（如 /images/xxx.jpg）"
                  />
                  <input
                    value={ad.href}
                    onChange={(e) => updateAdField(field.key, "href", e.target.value)}
                    className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                    placeholder="点击跳转链接（如 /membership）"
                  />
                </article>
              );
            })}
          </div>
        </section>

        {message && <p className="text-xs text-accent">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-accent text-white text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>

      <section className="rounded-xl border border-border bg-surface-elevated p-6 space-y-4">
        <header>
          <h2 className="font-serif text-lg font-semibold text-primary">栏目名称与简介（SEO）</h2>
          <p className="text-sm text-muted">可自主调整栏目名称和栏目简介，栏目简介会用于页面 SEO 描述。</p>
        </header>

        {categoryLoading ? (
          <p className="text-sm text-muted">栏目加载中...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted">暂无可编辑栏目。</p>
        ) : (
          <div className="space-y-4">
            {categories.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs text-muted">{item.href}</p>
                  <button
                    type="button"
                    onClick={() => void handleSaveCategory(item.id)}
                    disabled={savingCategoryId === item.id || !item.title.trim()}
                    className="px-3 py-1.5 rounded border border-border text-xs text-primary hover:bg-surface-elevated disabled:opacity-50"
                  >
                    {savingCategoryId === item.id ? "保存中..." : "保存栏目"}
                  </button>
                </div>

                <label className="block text-xs text-muted mb-1">栏目名称</label>
                <input
                  value={item.title}
                  onChange={(e) => updateCategoryField(item.id, "title", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                  placeholder="请输入栏目名称"
                />

                <label className="block text-xs text-muted mt-3 mb-1">栏目简介（用于 SEO）</label>
                <textarea
                  value={item.desc}
                  onChange={(e) => updateCategoryField(item.id, "desc", e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-sm"
                  rows={3}
                  placeholder="请输入栏目简介"
                />
              </article>
            ))}
          </div>
        )}

        {categoryMessage && <p className="text-xs text-accent">{categoryMessage}</p>}
      </section>
    </div>
  );
}

