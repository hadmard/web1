"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type SiteSettings = {
  template: "brand_showcase" | "professional_service" | "simple_elegant";
  heroTitle: string;
  heroSubtitle: string;
  contactLabel: string;
  homepageTagline: string;
  homepageTags: string[];
  heroImageUrl: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  secondaryCtaType: "anchor" | "external";
  secondaryCtaTarget: string;
  capabilityCards: Array<{
    title: string;
    description: string;
    iconKey: string;
  }>;
  contact: {
    contactPerson: string;
    contactPhone: string;
    wechatId: string;
    wechatQrImageUrl: string;
    websiteUrl: string;
    city: string;
    address: string;
    contactFormUrl: string;
    contactIntro: string;
  };
  modules: {
    intro: boolean;
    advantages: boolean;
    tags: boolean;
    news: boolean;
    gallery: boolean;
    contact: boolean;
    standards: boolean;
    terms: boolean;
    video: boolean;
  };
  seo: {
    title: string;
    keywords: string;
    description: string;
    imageUrl: string;
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
  contactLabel: "立即咨询",
  homepageTagline: "",
  homepageTags: [],
  heroImageUrl: "",
  primaryCtaLabel: "立即咨询",
  secondaryCtaLabel: "查看案例",
  secondaryCtaType: "anchor",
  secondaryCtaTarget: "#gallery-section",
  capabilityCards: [],
  contact: {
    contactPerson: "",
    contactPhone: "",
    wechatId: "",
    wechatQrImageUrl: "",
    websiteUrl: "",
    city: "",
    address: "",
    contactFormUrl: "",
    contactIntro: "",
  },
  modules: {
    intro: true,
    advantages: true,
    tags: true,
    news: true,
    gallery: true,
    contact: true,
    standards: false,
    terms: false,
    video: false,
  },
  seo: {
    title: "",
    keywords: "",
    description: "",
    imageUrl: "",
  },
  sync: {
    websiteUrl: "",
    apiEndpoint: "",
    rssUrl: "",
    syncEnabled: false,
  },
};

function normalizeSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    template: "brand_showcase",
    contactLabel: settings.primaryCtaLabel || "立即咨询",
    modules: {
      ...settings.modules,
      intro: true,
      advantages: true,
      tags: true,
      news: true,
      gallery: true,
      contact: true,
      standards: false,
      terms: false,
      video: false,
    },
  };
}

export default function MembershipSitePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState("");

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
        const nextSettings = normalizeSettings(data.settings ?? EMPTY_SETTINGS);
        setSettings(nextSettings);
        setSavedSnapshot(JSON.stringify(nextSettings));
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const settingsSnapshot = useMemo(() => JSON.stringify(settings), [settings]);
  const hasUnsavedChanges = settingsSnapshot !== savedSnapshot;
  const capabilityCount = settings.capabilityCards.filter((item) => item.title || item.description).length;
  const tagCount = settings.homepageTags.length;

  async function handleSave() {
    setSaving(true);
    setMessage("正在保存...");
    try {
      const payload = normalizeSettings(settings);
      const res = await fetch("/api/member/site-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }
      const nextSettings = normalizeSettings(data.settings ?? payload);
      setSettings(nextSettings);
      setSavedSnapshot(JSON.stringify(nextSettings));
      setMessage("企业主页配置已保存");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后管理企业主页。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">
          首页
        </Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">
          会员系统
        </Link>
        <span className="mx-2">/</span>
        <Link href="/membership/content" className="hover:text-accent">
          会员后台
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">企业主页配置</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Homepage Editor</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">企业主页配置</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                把这一页填完整，企业主页就会自动形成统一的官网效果。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TopInfoCard label="主页样式" value="高端品牌型" />
              <TopInfoCard label="核心能力" value={`${capabilityCount} 条`} />
              <TopInfoCard label="保存状态" value={hasUnsavedChanges ? "待保存" : "已同步"} />
            </div>
          </div>
          {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <Panel title="首屏设置" defaultOpen>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="企业名称" value={settings.heroTitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroTitle: value }))} />
              <TextField label="一句话定位" value={settings.homepageTagline} onChange={(value) => setSettings((prev) => ({ ...prev, homepageTagline: value }))} />
            </div>
            <div className="mt-4">
              <TextAreaField label="补充说明" value={settings.heroSubtitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroSubtitle: value }))} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField
                label="品牌标签"
                value={settings.homepageTags.join(", ")}
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    homepageTags: value
                      .split(/[,，]/)
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .slice(0, 6),
                  }))
                }
              />
              <TextField label="主视觉图" value={settings.heroImageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, heroImageUrl: value }))} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField
                label="主按钮文案"
                value={settings.primaryCtaLabel}
                onChange={(value) => setSettings((prev) => ({ ...prev, primaryCtaLabel: value, contactLabel: value }))}
              />
              <TextField
                label="次按钮文案"
                value={settings.secondaryCtaLabel}
                onChange={(value) => setSettings((prev) => ({ ...prev, secondaryCtaLabel: value }))}
              />
            </div>
          </Panel>

          <Panel title="品牌展示" defaultOpen>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-primary">核心能力卡片</h3>
              <button
                type="button"
                disabled={settings.capabilityCards.length >= 6}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    capabilityCards: [...prev.capabilityCards, { title: "", description: "", iconKey: "" }],
                  }))
                }
                className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                新增
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {settings.capabilityCards.length === 0 ? (
                <div className="rounded-[24px] border border-border bg-surface px-4 py-4 text-sm text-muted">
                  还没有填写核心能力。
                </div>
              ) : null}
              {settings.capabilityCards.map((card, index) => (
                <div key={`capability-${index}`} className="rounded-[24px] border border-border bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-primary">能力 {index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          capabilityCards: prev.capabilityCards.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="text-sm text-accent hover:underline"
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="标题"
                      value={card.title}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          capabilityCards: prev.capabilityCards.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item)),
                        }))
                      }
                    />
                    <TextField
                      label="补充标识"
                      value={card.iconKey}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          capabilityCards: prev.capabilityCards.map((item, itemIndex) => (itemIndex === index ? { ...item, iconKey: value } : item)),
                        }))
                      }
                    />
                  </div>
                  <div className="mt-4">
                    <TextAreaField
                      label="一句话描述"
                      value={card.description}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          capabilityCards: prev.capabilityCards.map((item, itemIndex) => (itemIndex === index ? { ...item, description: value } : item)),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="内容展示" defaultOpen>
            <div className="grid gap-4 md:grid-cols-2">
              <EntryCard title="企业动态" description="继续完善企业动态内容。" href="/membership/content/news" actionLabel="管理动态" />
              <EntryCard title="案例 / 图库" description="继续补充案例和项目图片。" href="/membership/content/gallery" actionLabel="管理图库" />
            </div>
          </Panel>

          <Panel title="联系转化" defaultOpen>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="联系人" value={settings.contact.contactPerson} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPerson: value } }))} />
              <TextField label="电话" value={settings.contact.contactPhone} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPhone: value } }))} />
              <TextField label="微信" value={settings.contact.wechatId} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, wechatId: value } }))} />
              <TextField label="微信二维码" value={settings.contact.wechatQrImageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, wechatQrImageUrl: value } }))} />
              <TextField label="官网" value={settings.contact.websiteUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, websiteUrl: value } }))} />
              <TextField label="城市" value={settings.contact.city} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, city: value } }))} />
              <TextField label="地址" value={settings.contact.address} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, address: value } }))} />
              <TextField label="表单链接" value={settings.contact.contactFormUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactFormUrl: value } }))} />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="联系引导文案"
                value={settings.contact.contactIntro}
                onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactIntro: value } }))}
              />
            </div>
          </Panel>

          <Panel title="搜索与分享">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="SEO 标题" value={settings.seo.title} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))} />
              <TextField label="分享封面图" value={settings.seo.imageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, imageUrl: value } }))} />
            </div>
            <div className="mt-4">
              <TextAreaField label="SEO 描述" value={settings.seo.description} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))} />
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">当前内容概览</h2>
            <div className="mt-4 space-y-3">
              <SummaryRow label="主页样式" value="高端品牌型" />
              <SummaryRow label="企业名称" value={settings.heroTitle || "未填写"} />
              <SummaryRow label="一句话定位" value={settings.homepageTagline || "未填写"} />
              <SummaryRow label="品牌标签" value={tagCount ? `${tagCount} 个` : "未填写"} />
              <SummaryRow label="核心能力" value={capabilityCount ? `${capabilityCount} 条` : "未填写"} />
              <SummaryRow label="联系人" value={settings.contact.contactPerson || "未填写"} />
              <SummaryRow label="电话" value={settings.contact.contactPhone || "未填写"} />
              <SummaryRow label="SEO" value={settings.seo.title || settings.seo.description ? "已填写" : "未填写"} />
            </div>
          </article>
        </aside>
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
          {saving ? "保存中..." : hasUnsavedChanges ? "保存企业主页" : "已保存"}
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
    >
      <summary className="cursor-pointer list-none text-lg font-semibold text-primary [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function EntryCard({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <p className="text-base font-medium text-primary">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function TopInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border bg-white/85 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.84))] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-primary">{value}</span>
    </div>
  );
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
