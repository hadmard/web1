"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type SiteSettings = {
  template: "brand_showcase" | "professional_service" | "simple_elegant";
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
  template: "brand_showcase",
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

const TEMPLATE_OPTIONS: Array<{ value: SiteSettings["template"]; label: string; desc: string }> = [
  { value: "brand_showcase", label: "品牌展示型", desc: "适合整木品牌、高定企业和工厂型企业，强调品牌、案例与材质感。" },
  { value: "professional_service", label: "专业服务型", desc: "适合设计机构、顾问公司、配套服务商，强调能力结构与服务流程。" },
  { value: "simple_elegant", label: "简约基础型", desc: "适合新入驻会员或资料较少的企业，简洁克制但不显廉价。" },
];

export default function MembershipSitePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        const nextSettings = data.settings ?? EMPTY_SETTINGS;
        setSettings(nextSettings);
        setSavedSnapshot(JSON.stringify(nextSettings));
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.value === settings.template) ?? TEMPLATE_OPTIONS[0],
    [settings.template]
  );
  const settingsSnapshot = useMemo(() => JSON.stringify(settings), [settings]);
  const hasUnsavedChanges = settingsSnapshot !== savedSnapshot;

  async function handleSave() {
    setSaving(true);
    setMessage("正在保存会员站设置...");
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
      const nextSettings = data.settings ?? settings;
      setSettings(nextSettings);
      setSavedSnapshot(JSON.stringify(nextSettings));
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
        <p className="mt-3 text-sm text-muted">先选模板，再补充主标题和首页说明。高级同步与 SEO 选项默认收起，日常操作更简单。</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-[rgba(180,154,107,0.12)] px-3 py-1 text-primary">当前模板：{currentTemplate.label}</span>
          {hasUnsavedChanges ? <span className="rounded-full bg-[rgba(15,23,42,0.06)] px-3 py-1 text-muted">有未保存改动</span> : null}
          {message ? <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">{message}</span> : null}
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">1. 选择模板</h2>
        <p className="text-sm text-muted">三套模板都在这里，先选一个最接近你企业气质的样式。</p>
        <div className="grid gap-3 md:grid-cols-3">
          {TEMPLATE_OPTIONS.map((option) => {
            const active = settings.template === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, template: option.value }))}
                className={`rounded-3xl border p-5 text-left transition ${
                  active
                    ? "border-accent bg-[linear-gradient(135deg,rgba(186,158,108,0.18),rgba(255,255,255,0.95))] shadow-[0_18px_36px_rgba(180,154,107,0.18)]"
                    : "border-border bg-surface hover:border-accent/30 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-primary">{option.label}</p>
                  {active ? <span className="rounded-full bg-accent px-3 py-1 text-xs text-white">当前使用</span> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{option.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">2. 快速设置</h2>
        <p className="text-sm text-muted">这几项决定会员站首页最先被看到的内容，日常优先改这里就够用了。</p>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="首页主标题" value={settings.heroTitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroTitle: value }))} />
          <TextField label="联系按钮文案" value={settings.contactLabel} onChange={(value) => setSettings((prev) => ({ ...prev, contactLabel: value }))} />
        </div>
        <TextAreaField label="首页副标题" value={settings.heroSubtitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroSubtitle: value }))} />
      </section>

      <section className="rounded-3xl border border-border bg-surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">3. 展示模块</h2>
        <p className="text-sm text-muted">需要展示的模块保留，不需要的直接关闭，页面会更清爽。</p>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">4. 高级设置</h2>
            <p className="mt-1 text-sm text-muted">SEO 和同步能力平时不常改，默认收起，避免后台显得太复杂。</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white"
          >
            {showAdvanced ? "收起高级设置" : "展开高级设置"}
          </button>
        </div>
        {showAdvanced ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-base font-semibold text-primary">SEO 设置</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="SEO 标题" value={settings.seo.title} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))} />
                <TextField label="SEO 关键词" value={settings.seo.keywords} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, keywords: value } }))} />
              </div>
              <TextAreaField label="SEO 描述" value={settings.seo.description} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))} />
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-base font-semibold text-primary">同步与扩展</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="企业官网地址" value={settings.sync.websiteUrl} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, websiteUrl: value } }))} />
                <TextField label="API 接口地址" value={settings.sync.apiEndpoint} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, apiEndpoint: value } }))} />
                <TextField label="RSS 地址" value={settings.sync.rssUrl} onChange={(value) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, rssUrl: value } }))} />
                <label className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-sm">
                  <span className="text-primary">开启同步</span>
                  <input
                    type="checkbox"
                    checked={settings.sync.syncEnabled}
                    onChange={(e) => setSettings((prev) => ({ ...prev, sync: { ...prev.sync, syncEnabled: e.target.checked } }))}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted">
            高级设置已折叠。只有在你需要做 SEO 优化或站外同步时，再展开编辑即可。
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !hasUnsavedChanges}
          className={`rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition ${
            saving
              ? "bg-accent shadow-[0_16px_36px_rgba(180,154,107,0.28)]"
              : hasUnsavedChanges
                ? "bg-accent shadow-[0_16px_36px_rgba(180,154,107,0.28)] hover:brightness-105"
                : "bg-muted/60"
          } disabled:cursor-not-allowed disabled:opacity-100`}
        >
          {saving ? "保存中..." : hasUnsavedChanges ? "保存会员站设置" : "已保存"}
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
