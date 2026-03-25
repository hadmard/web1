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
  contactLabel: "联系我们",
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
    standards: true,
    terms: true,
    video: true,
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

const TEMPLATE_OPTIONS: Array<{
  value: SiteSettings["template"];
  label: string;
  eyebrow: string;
  desc: string;
  bullets: string[];
  previewClass: string;
}> = [
  {
    value: "brand_showcase",
    label: "高端品牌型",
    eyebrow: "模板 A",
    desc: "大图首屏、留白节奏和品牌画面更强，适合高定、整木、进口品牌与强调形象表达的企业。",
    bullets: ["品牌官网感", "大图首屏", "留白更强"],
    previewClass:
      "bg-[radial-gradient(circle_at_top,rgba(212,177,120,0.34),transparent_46%),linear-gradient(160deg,#1f1b16,#4c3d2b_48%,#f5efe7)]",
  },
  {
    value: "professional_service",
    label: "招商转化型",
    eyebrow: "模板 B",
    desc: "强调优势表达、合作转化和沟通效率，适合招商、加盟、工程与重咨询转化的企业。",
    bullets: ["CTA 更强", "合作导向", "转化更直接"],
    previewClass:
      "bg-[radial-gradient(circle_at_top_left,rgba(109,143,173,0.34),transparent_38%),linear-gradient(150deg,#11202e,#213a50_52%,#edf4f8)]",
  },
  {
    value: "simple_elegant",
    label: "内容运营型",
    eyebrow: "模板 C",
    desc: "强化新闻、案例和持续更新感，让企业主页更像官网加资讯站，适合经常发内容的企业。",
    bullets: ["内容优先", "资讯感更强", "持续更新"],
    previewClass:
      "bg-[radial-gradient(circle_at_top,rgba(224,196,157,0.28),transparent_40%),linear-gradient(180deg,#ffffff,#f6f1ea_64%,#ece4d9)]",
  },
];

const MODULE_OPTIONS: Array<{ key: keyof SiteSettings["modules"]; label: string; desc: string }> = [
  { key: "intro", label: "企业简介", desc: "展示企业介绍、定位、地址等基础资料。" },
  { key: "advantages", label: "核心优势", desc: "突出产品体系、工艺等级、认证和获奖。" },
  { key: "news", label: "企业动态", desc: "展示企业发布的资讯内容，更像一个小型官网。" },
  { key: "gallery", label: "案例图库", desc: "展示企业图片与项目画面，强化品牌质感。" },
  { key: "tags", label: "首页标签", desc: "在首屏展示行业定位、区域和产品关键词。" },
  { key: "contact", label: "联系方式", desc: "展示联系人、电话、官网和合作入口。" },
  { key: "standards", label: "标准参与", desc: "展示企业关联的标准项目和参与记录。" },
  { key: "terms", label: "词库参与", desc: "展示企业词条和行业词库共建内容。" },
  { key: "video", label: "企业视频", desc: "展示企业视频入口或品牌片链接。" },
];

function enforceFixedModules(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    modules: {
      ...settings.modules,
      intro: true,
      news: true,
      gallery: true,
      contact: true,
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
        const nextSettings = enforceFixedModules(data.settings ?? EMPTY_SETTINGS);
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
      const nextSettings = enforceFixedModules(data.settings ?? settings);
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

  const coreModules = MODULE_OPTIONS.filter((option) =>
    ["intro", "advantages", "news", "gallery", "contact"].includes(option.key)
  );
  const extendedModules = MODULE_OPTIONS.filter((option) => !["intro", "advantages", "news", "gallery", "contact"].includes(option.key));
  const enabledModules = MODULE_OPTIONS.filter((option) => settings.modules[option.key]);

  const lockedModules = new Set<keyof SiteSettings["modules"]>(["intro", "news", "gallery", "contact"]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
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

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Site Studio</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">会员站设置</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                主流后台更强调“一页完成核心配置”。这里把模板、首页文案和展示模块收成一个工作台，日常只改这一页就够了。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TopInfoCard label="当前模板" value={currentTemplate.label} />
              <TopInfoCard label="已开模块" value={`${enabledModules.length} 个`} />
              <TopInfoCard label="保存状态" value={hasUnsavedChanges ? "待保存" : "已同步"} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link href="/membership/profile" className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-primary transition hover:bg-white">
              基础资料
            </Link>
            <Link href="/membership/content/publish?tab=articles" className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-primary transition hover:bg-white">
              内容发布
            </Link>
            <Link href="/membership/content/verification" className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-primary transition hover:bg-white">
              企业认证
            </Link>
            <Link href="/membership/content/status" className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-primary transition hover:bg-white">
              审核记录
            </Link>
          </div>
          {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">模板风格</h2>
                <p className="mt-1 text-sm text-muted">选一个最接近你企业气质的官网表达，不需要再拆很多页面去管理。</p>
              </div>
              {hasUnsavedChanges ? <span className="rounded-full bg-[rgba(15,23,42,0.06)] px-3 py-1 text-xs text-muted">有未保存改动</span> : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
          {TEMPLATE_OPTIONS.map((option) => {
            const active = settings.template === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, template: option.value }))}
                className={`rounded-[30px] border p-5 text-left transition ${
                  active
                    ? "border-accent bg-[linear-gradient(135deg,rgba(186,158,108,0.18),rgba(255,255,255,0.95))] shadow-[0_24px_44px_rgba(180,154,107,0.18)]"
                    : "border-border bg-surface hover:border-accent/30 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                }`}
              >
                <div className={`overflow-hidden rounded-[24px] p-4 text-white ${option.previewClass}`}>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/72">{option.eyebrow}</p>
                  <div className="mt-4 grid grid-cols-[1.2fr,0.8fr] gap-3">
                    <div className="rounded-[20px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                      <div className="h-2.5 w-20 rounded-full bg-white/60" />
                      <div className="mt-3 h-2 w-full rounded-full bg-white/20" />
                      <div className="mt-2 h-2 w-4/5 rounded-full bg-white/20" />
                      <div className="mt-5 h-24 rounded-[18px] bg-white/14" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-20 rounded-[18px] bg-white/14" />
                      <div className="h-20 rounded-[18px] bg-white/10" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{option.eyebrow}</p>
                    <p className="mt-1 text-base font-semibold text-primary">{option.label}</p>
                  </div>
                  {active ? <span className="rounded-full bg-accent px-3 py-1 text-xs text-white">当前使用</span> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{option.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {option.bullets.map((bullet) => (
                    <span key={bullet} className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted">
                      {bullet}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">首屏设置</h2>
            <p className="mt-1 text-sm text-muted">先把一句话定位、标签、主视觉和 CTA 配好，企业主页的品牌感会先立住。</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="首页主标题" value={settings.heroTitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroTitle: value }))} />
              <TextField label="一句话定位" value={settings.homepageTagline} onChange={(value) => setSettings((prev) => ({ ...prev, homepageTagline: value }))} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField label="主按钮文案" value={settings.primaryCtaLabel} onChange={(value) => setSettings((prev) => ({ ...prev, primaryCtaLabel: value, contactLabel: value }))} />
              <TextField label="次按钮文案" value={settings.secondaryCtaLabel} onChange={(value) => setSettings((prev) => ({ ...prev, secondaryCtaLabel: value }))} />
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
              <label className="block">
                <span className="text-sm text-primary">次按钮跳转类型</span>
                <select
                  className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                  value={settings.secondaryCtaType}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      secondaryCtaType: e.target.value === "external" ? "external" : "anchor",
                      secondaryCtaTarget: e.target.value === "external" ? prev.secondaryCtaTarget : "#gallery-section",
                    }))
                  }
                >
                  <option value="anchor">页面锚点</option>
                  <option value="external">外部链接</option>
                </select>
              </label>
              <TextField
                label={settings.secondaryCtaType === "external" ? "次按钮目标链接" : "次按钮锚点"}
                value={settings.secondaryCtaTarget}
                onChange={(value) => setSettings((prev) => ({ ...prev, secondaryCtaTarget: value }))}
              />
            </div>
            <div className="mt-4">
              <TextAreaField label="首页副标题" value={settings.heroSubtitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroSubtitle: value }))} />
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">核心能力卡片</h2>
                <p className="mt-1 text-sm text-muted">建议维护 3 到 6 条，把企业能力从长文本里拆成更适合前台展示的结构。</p>
              </div>
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
                新增卡片
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {settings.capabilityCards.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted">
                  还没有配置专用能力卡片。前台会先根据企业主营、工艺和区域自动补齐。
                </div>
              ) : null}
              {settings.capabilityCards.map((card, index) => (
                <div key={`capability-${index}`} className="rounded-[24px] border border-border bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-primary">卡片 {index + 1}</p>
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
                      label="图标标识"
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
                      label="描述"
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
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">联系转化</h2>
            <p className="mt-1 text-sm text-muted">优先填写真实可联系的信息；缺少时前台会保留平台兜底入口，但不会伪造数据。</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="联系人" value={settings.contact.contactPerson} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPerson: value } }))} />
              <TextField label="联系电话" value={settings.contact.contactPhone} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPhone: value } }))} />
              <TextField label="微信号" value={settings.contact.wechatId} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, wechatId: value } }))} />
              <TextField label="微信二维码" value={settings.contact.wechatQrImageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, wechatQrImageUrl: value } }))} />
              <TextField label="官网链接" value={settings.contact.websiteUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, websiteUrl: value } }))} />
              <TextField label="所在城市" value={settings.contact.city} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, city: value } }))} />
              <TextField label="联系表单链接" value={settings.contact.contactFormUrl} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactFormUrl: value } }))} />
              <TextField label="地址" value={settings.contact.address} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, address: value } }))} />
            </div>
            <div className="mt-4">
              <TextAreaField label="联系引导文案" value={settings.contact.contactIntro} onChange={(value) => setSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactIntro: value } }))} />
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">首页展示模块</h2>
            <p className="mt-1 text-sm text-muted">主流网站一般只让你先决定几个最核心模块，其他功能折叠成扩展选项。</p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {coreModules.map((option) => {
                const enabled = settings.modules[option.key];
                const locked = lockedModules.has(option.key);
                return (
                  <label
                    key={option.key}
                    className={`flex items-start justify-between gap-4 rounded-[24px] border px-4 py-4 transition ${
                      enabled
                        ? "border-accent/40 bg-[linear-gradient(135deg,rgba(186,158,108,0.12),rgba(255,255,255,0.96))] shadow-[0_16px_30px_rgba(180,154,107,0.12)]"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div>
                      <p className="text-base font-medium text-primary">{option.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{option.desc}</p>
                      {locked ? <p className="mt-2 text-xs text-accent">该模块为固定结构，前台始终展示。</p> : null}
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={locked}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          modules: { ...prev.modules, [option.key]: e.target.checked },
                        }))
                      }
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
            <details className="mt-4 rounded-[24px] border border-dashed border-border bg-surface px-4 py-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">更多模块</summary>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {extendedModules.map((option) => {
            const enabled = settings.modules[option.key];
            return (
              <label
                key={option.key}
                className={`flex items-start justify-between gap-4 rounded-[24px] border px-4 py-4 transition ${
                  enabled
                    ? "border-accent/40 bg-[linear-gradient(135deg,rgba(186,158,108,0.12),rgba(255,255,255,0.96))] shadow-[0_16px_30px_rgba(180,154,107,0.12)]"
                    : "border-border bg-surface"
                }`}
              >
                <div>
                  <p className="text-base font-medium text-primary">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{option.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      modules: { ...prev.modules, [option.key]: e.target.checked },
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
              </label>
            );
                })}
              </div>
            </details>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-primary">高级设置</h2>
                <p className="mt-1 text-sm text-muted">SEO 和同步能力默认折叠，只有需要时再展开，后台看起来会更轻松。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced((value) => !value)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white"
              >
                {showAdvanced ? "收起" : "展开"}
              </button>
            </div>
            {showAdvanced ? (
              <div className="mt-5 space-y-6">
                <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
                  <h3 className="text-base font-semibold text-primary">SEO 设置</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="SEO 标题" value={settings.seo.title} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))} />
                    <TextField label="SEO 关键词" value={settings.seo.keywords} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, keywords: value } }))} />
                  </div>
                  <div className="mt-4">
                    <TextField label="分享封面图" value={settings.seo.imageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, seo: { ...prev.seo, imageUrl: value } }))} />
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
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted">
                高级设置已折叠。大部分企业日常只需要改模板、标题和展示模块。
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">当前站点概览</h2>
            <div className="mt-4 space-y-3">
              <SummaryRow label="模板" value={currentTemplate.label} />
              <SummaryRow label="首页标题" value={settings.heroTitle || "未设置"} />
              <SummaryRow label="一句话定位" value={settings.homepageTagline || "未设置"} />
              <SummaryRow label="主按钮" value={settings.primaryCtaLabel || "立即咨询"} />
              <SummaryRow label="次按钮" value={settings.secondaryCtaLabel || "查看案例"} />
              <SummaryRow label="能力卡片" value={`${settings.capabilityCards.filter((item) => item.title || item.description).length} 条`} />
              <SummaryRow label="联系电话" value={settings.contact.contactPhone || "未设置"} />
              <SummaryRow label="分享图" value={settings.seo.imageUrl ? "已设置" : "未设置"} />
              <SummaryRow label="SEO 状态" value={settings.seo.title || settings.seo.description ? "已填写" : "未填写"} />
              <SummaryRow label="同步状态" value={settings.sync.syncEnabled ? "已开启" : "未开启"} />
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">首页会展示</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {enabledModules.map((option) => (
                <span key={option.key} className="rounded-full border border-[rgba(175,143,88,0.22)] bg-white px-3 py-1 text-xs text-primary">
                  {option.label}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">使用建议</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>先写一句话定位，再补主视觉图和两个按钮文案。</li>
              <li>品牌标签建议控制在 3 到 6 个，避免首屏过满。</li>
              <li>SEO 和同步不是日常操作，保持折叠就行。</li>
            </ul>
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
          {saving ? "保存中..." : hasUnsavedChanges ? "保存会员站设置" : "已保存"}
        </button>
      </div>
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
