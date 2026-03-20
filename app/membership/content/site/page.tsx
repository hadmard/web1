"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type SiteSettings = {
  heroTitle: string;
  heroSubtitle: string;
  contactLabel: string;
  modules: {
    intro: boolean;
    advantages: boolean;
    tags: boolean;
    contact: boolean;
    standards: boolean;
    terms: boolean;
    brands: boolean;
    video: boolean;
  };
  seo: {
    title: string;
    keywords: string;
    description: string;
  };
  sync: {
    websiteUrl: string;
    apiEndpoint: string;
    rssUrl: string;
    syncEnabled: boolean;
  };
};

const EMPTY_SETTINGS: SiteSettings = {
  heroTitle: "",
  heroSubtitle: "",
  contactLabel: "联系我们",
  modules: {
    intro: true,
    advantages: true,
    tags: true,
    contact: true,
    standards: true,
    terms: true,
    brands: true,
    video: true,
  },
  seo: {
    title: "",
    keywords: "",
    description: "",
  },
  sync: {
    websiteUrl: "",
    apiEndpoint: "",
    rssUrl: "",
    syncEnabled: false,
  },
};

export default function MembershipSitePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/member/site-settings", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          setMessage(data.error ?? "加载失败");
          return;
        }
        setAuthed(true);
        setSettings(data.settings ?? EMPTY_SETTINGS);
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/member/site-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }
      setSettings(data.settings ?? settings);
      setMessage("会员站设置已保存");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后管理会员站。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <Link href="/membership/content" className="hover:text-accent">会员后台</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">会员站管理</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <header className="rounded-3xl border border-border bg-surface-elevated p-6">
        <h1 className="font-serif text-3xl font-semibold text-primary">会员站管理</h1>
        <p className="mt-3 text-sm text-muted">配置企业会员站首页标题、展示模块、SEO 信息与同步开关。</p>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">首页展示</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="首页主标题" value={settings.heroTitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroTitle: value }))} />
          <TextField label="联系按钮文案" value={settings.contactLabel} onChange={(value) => setSettings((prev) => ({ ...prev, contactLabel: value }))} />
        </div>
        <TextAreaField label="首页副标题" value={settings.heroSubtitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroSubtitle: value }))} />
      </section>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">展示模块开关</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(settings.modules).map(([key, enabled]) => (
            <label key={key} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
              <span className="text-primary">{moduleLabel(key)}</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    modules: { ...prev.modules, [key]: e.target.checked },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">SEO 设置</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="SEO 标题" value={settings.seo.title} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))} />
          <TextField label="SEO 关键词" value={settings.seo.keywords} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, keywords: value } }))} />
        </div>
        <TextAreaField label="SEO 描述" value={settings.seo.description} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))} />
      </section>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">同步与扩展</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="企业官网地址" value={settings.sync.websiteUrl} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, websiteUrl: value } }))} />
          <TextField label="API 接口地址" value={settings.sync.apiEndpoint} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, apiEndpoint: value } }))} />
          <TextField label="RSS 地址" value={settings.sync.rssUrl} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, rssUrl: value } }))} />
          <label className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-primary">开启同步</span>
            <input
              type="checkbox"
              checked={settings.sync.syncEnabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, syncEnabled: e.target.checked } }))}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存会员站设置"}
        </button>
      </div>
    </div>
  );
}

function moduleLabel(key: string) {
  switch (key) {
    case "intro":
      return "企业简介";
    case "advantages":
      return "核心优势";
    case "tags":
      return "企业标签";
    case "contact":
      return "联系方式";
    case "standards":
      return "标准参与";
    case "terms":
      return "词库参与";
    case "brands":
      return "品牌展示";
    case "video":
      return "企业视频";
    default:
      return key;
  }
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <input
        className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <textarea
        className="mt-1 min-h-24 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
