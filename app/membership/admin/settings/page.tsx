"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  BACKGROUND_IMAGE_FIELDS,
  DEFAULT_SITE_VISUAL_SETTINGS,
  HOME_AD_FIELDS,
  normalizeSiteVisualSettings,
  type BackgroundImageKey,
  type HomeAdKey,
  type SiteVisualSettings,
} from "@/lib/site-visual-config";
import { uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

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

type CropTarget =
  | { kind: "background"; key: BackgroundImageKey; label: string; requiredSize: string; source: string }
  | { kind: "ad"; key: HomeAdKey; label: string; requiredSize: string; source: string };

const VISUAL_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function parseRequiredSize(requiredSize: string) {
  const matched = requiredSize.match(/(\d+)\s*x\s*(\d+)/i);
  if (!matched) return { width: 1600, height: 900 };
  return { width: Number(matched[1]), height: Number(matched[2]) };
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const finalSrc = resolveUploadedImageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [finalSrc]);

  if (!finalSrc) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface p-3">
      <p className="mb-2 text-xs text-muted">当前图片预览</p>
      {failed ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-elevated px-3 py-6 text-xs text-muted">
          预览加载失败。请重新上传，或检查该图片文件是否仍然存在。
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalSrc}
          alt={alt}
          className="max-h-64 w-full rounded-lg border border-border bg-surface-elevated object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

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
          const data = (await categoryRes.json()) as Array<{ id: string; href: string; title: string; desc: string | null }>;
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

  const cropSize = useMemo(
    () => (cropTarget ? parseRequiredSize(cropTarget.requiredSize) : { width: 1600, height: 900 }),
    [cropTarget]
  );

  function updateBackgroundField(key: BackgroundImageKey, value: string) {
    setSettings((prev) => prev ? {
      ...prev,
      siteVisualSettings: {
        ...prev.siteVisualSettings,
        backgrounds: { ...prev.siteVisualSettings.backgrounds, [key]: value },
      },
    } : prev);
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
            [key]: { ...current, [field]: value },
          },
        },
      };
    });
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentReviewRequired: settings.contentReviewRequired,
          memberDownloadStandardEnabled: settings.memberDownloadStandardEnabled,
          memberDownloadReportEnabled: settings.memberDownloadReportEnabled,
          siteVisualSettings: settings.siteVisualSettings,
        }),
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
    setCategories((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function restoreBackgroundDefault(key: BackgroundImageKey) {
    if (!window.confirm("恢复默认图后，此位置将重新使用系统默认图片。是否继续？")) return;
    updateBackgroundField(key, DEFAULT_SITE_VISUAL_SETTINGS.backgrounds[key]);
    setMessage("已恢复默认图，请点击“保存”生效。");
  }

  function restoreAdDefaultImage(key: HomeAdKey) {
    if (!window.confirm("恢复默认图后，此广告位将重新使用系统默认图片。是否继续？")) return;
    updateAdField(key, "imageUrl", DEFAULT_SITE_VISUAL_SETTINGS.ads[key].imageUrl);
    setMessage("已恢复默认图，请点击“保存”生效。");
  }

  async function uploadBackgroundImage(key: BackgroundImageKey, file: File | null) {
    if (!file) return;
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "site-visual/backgrounds", maxBytes: VISUAL_IMAGE_MAX_BYTES });
      updateBackgroundField(key, imageUrl);
      setMessage("图片已加载，请点击“保存”生效。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片上传失败");
    }
  }

  async function uploadAdImage(key: HomeAdKey, file: File | null) {
    if (!file) return;
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "site-visual/ads", maxBytes: VISUAL_IMAGE_MAX_BYTES });
      updateAdField(key, "imageUrl", imageUrl);
      setMessage("广告图已加载，请点击“保存”生效。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片上传失败");
    }
  }

  async function applyCroppedImage(file: File, target: CropTarget) {
    try {
      const imageUrl = await uploadImageToServer(file, {
        folder: target.kind === "background" ? "site-visual/backgrounds" : "site-visual/ads",
        maxBytes: VISUAL_IMAGE_MAX_BYTES,
      });
      if (target.kind === "background") {
        updateBackgroundField(target.key, imageUrl);
      } else {
        updateAdField(target.key, "imageUrl", imageUrl);
      }
      setMessage(`${target.label}已裁剪，请点击“保存”生效。`);
      setCropTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片裁剪上传失败");
    }
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
        body: JSON.stringify({ title: target.title.trim(), desc: target.desc.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryMessage(data.error ?? `保存失败：${target.href}`);
        return;
      }
      setCategories((prev) => prev.map((item) => item.id === id ? {
        ...item,
        title: (data.title ?? item.title) as string,
        desc: ((data.desc ?? item.desc) as string | null) ?? "",
      } : item));
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
        <h1 className="mb-2 font-serif text-xl font-bold text-primary">系统设置</h1>
        <p className="text-sm text-muted">仅主管理员可访问。</p>
      </header>

      <form onSubmit={handleSaveSettings} className="space-y-4 rounded-xl border border-border bg-surface-elevated p-6">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">启用内容审核（关闭后仅子管理员后台直发，会员投稿仍需审核）</span>
          <input type="checkbox" checked={settings.contentReviewRequired} onChange={(e) => setSettings((prev) => prev ? { ...prev, contentReviewRequired: e.target.checked } : prev)} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">个人会员可下载标准文件</span>
          <input type="checkbox" checked={settings.memberDownloadStandardEnabled} onChange={(e) => setSettings((prev) => prev ? { ...prev, memberDownloadStandardEnabled: e.target.checked } : prev)} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span className="text-primary">个人会员可下载行业报告</span>
          <input type="checkbox" checked={settings.memberDownloadReportEnabled} onChange={(e) => setSettings((prev) => prev ? { ...prev, memberDownloadReportEnabled: e.target.checked } : prev)} />
        </label>

        <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <header>
            <h2 className="font-serif text-base font-semibold text-primary">背景图与广告位（仅主管理员）</h2>
            <p className="mt-1 text-xs text-muted">每张图都已标注建议尺寸，支持本地上传、当前图预览和直接裁剪。</p>
          </header>

          <div className="space-y-3">
            {BACKGROUND_IMAGE_FIELDS.map((field) => {
              const imageUrl = settings.siteVisualSettings.backgrounds[field.key];
              const isCustomized = imageUrl !== DEFAULT_SITE_VISUAL_SETTINGS.backgrounds[field.key];
              return (
                <div key={field.key} className="rounded-lg border border-border bg-surface-elevated p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="text-sm text-primary">{field.label}</label>
                    <span className="text-[11px] text-muted">建议尺寸：{field.requiredSize}</span>
                  </div>
                  {field.key === "homeHero" && <p className="mb-2 text-[11px] text-muted">留空将使用首页纯色背景；上传图片后会覆盖纯色背景。</p>}
                  {field.key === "homeHuadian" && <p className="mb-2 text-[11px] text-muted">对应前台首页“华点榜 · 本年度信用推荐”顶部图片。</p>}
                  <input value={imageUrl} onChange={(e) => updateBackgroundField(field.key, e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" placeholder="请输入图片 URL（如 /images/xxx.jpg）" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="file" accept="image/*" onChange={(e) => { void uploadBackgroundImage(field.key, e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} className="block text-xs text-muted" />
                    <span className="text-[11px] text-muted">支持本地上传，最大 2MB</span>
                    {imageUrl && <button type="button" onClick={() => setCropTarget({ kind: "background", key: field.key, label: field.label, requiredSize: field.requiredSize, source: imageUrl })} className="rounded border border-border px-2 py-1 text-xs hover:bg-surface">裁剪</button>}
                    {isCustomized && <button type="button" onClick={() => restoreBackgroundDefault(field.key)} className="rounded border border-border px-2 py-1 text-xs hover:bg-surface">恢复默认图</button>}
                  </div>
                  <ImagePreview src={imageUrl} alt={field.label} />
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {HOME_AD_FIELDS.map((field) => {
              const ad = settings.siteVisualSettings.ads[field.key] ?? DEFAULT_SITE_VISUAL_SETTINGS.ads[field.key];
              const isCustomized = ad.imageUrl !== DEFAULT_SITE_VISUAL_SETTINGS.ads[field.key].imageUrl;
              return (
                <article key={field.key} className="space-y-2 rounded-lg border border-border bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-primary">{field.label}</p>
                    <span className="text-[11px] text-muted">建议尺寸：{field.requiredSize}</span>
                  </div>
                  <label className="flex items-center justify-between gap-3 text-xs text-muted">
                    <span>启用广告位</span>
                    <input type="checkbox" checked={ad.enabled} onChange={(e) => updateAdField(field.key, "enabled", e.target.checked)} />
                  </label>
                  <input value={ad.title} onChange={(e) => updateAdField(field.key, "title", e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" placeholder="广告位标题" />
                  <input value={ad.imageUrl} onChange={(e) => updateAdField(field.key, "imageUrl", e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" placeholder="广告图片 URL（如 /images/xxx.jpg）" />
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="file" accept="image/*" onChange={(e) => { void uploadAdImage(field.key, e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} className="block text-xs text-muted" />
                    <span className="text-[11px] text-muted">支持本地上传，最大 2MB</span>
                    {ad.imageUrl && <button type="button" onClick={() => setCropTarget({ kind: "ad", key: field.key, label: field.label, requiredSize: field.requiredSize, source: ad.imageUrl })} className="rounded border border-border px-2 py-1 text-xs hover:bg-surface">裁剪</button>}
                    {isCustomized && <button type="button" onClick={() => restoreAdDefaultImage(field.key)} className="rounded border border-border px-2 py-1 text-xs hover:bg-surface">恢复默认图</button>}
                  </div>
                  <ImagePreview src={ad.imageUrl} alt={field.label} />
                  <input value={ad.href} onChange={(e) => updateAdField(field.key, "href", e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" placeholder="点击跳转链接（如 /membership）" />
                </article>
              );
            })}
          </div>
        </section>

        {message && <p className="text-xs text-accent">{message}</p>}
        <button type="submit" disabled={saving} className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
      </form>

      <section className="space-y-4 rounded-xl border border-border bg-surface-elevated p-6">
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
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">{item.href}</p>
                  <button type="button" onClick={() => void handleSaveCategory(item.id)} disabled={savingCategoryId === item.id || !item.title.trim()} className="rounded border border-border px-3 py-1.5 text-xs text-primary hover:bg-surface-elevated disabled:opacity-50">
                    {savingCategoryId === item.id ? "保存中..." : "保存栏目"}
                  </button>
                </div>
                <label className="mb-1 block text-xs text-muted">栏目名称</label>
                <input value={item.title} onChange={(e) => updateCategoryField(item.id, "title", e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" placeholder="请输入栏目名称" />
                <label className="mb-1 mt-3 block text-xs text-muted">栏目简介（用于 SEO）</label>
                <textarea value={item.desc} onChange={(e) => updateCategoryField(item.id, "desc", e.target.value)} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" rows={3} placeholder="请输入栏目简介" />
              </article>
            ))}
          </div>
        )}
        {categoryMessage && <p className="text-xs text-accent">{categoryMessage}</p>}
      </section>

      {cropTarget && (
        <ImageCropDialog
          source={resolveUploadedImageUrl(cropTarget.source)}
          title={`裁剪${cropTarget.label}`}
          description={`按建议尺寸裁剪：${cropTarget.requiredSize}。裁剪后会直接替换当前图片，记得再点击“保存”。`}
          aspectWidth={cropSize.width}
          aspectHeight={cropSize.height}
          outputWidth={cropSize.width}
          outputHeight={cropSize.height}
          onCancel={() => setCropTarget(null)}
          onConfirm={async (file) => { await applyCroppedImage(file, cropTarget); }}
        />
      )}
    </div>
  );
}
