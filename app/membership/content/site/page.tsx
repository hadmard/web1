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
    label: "品牌旗舰型",
    eyebrow: "高端品牌官网",
    desc: "大图首屏、企业动态和案例图库都会更突出，适合制造品牌、整木工厂和高定企业。",
    bullets: ["沉浸式首屏", "企业动态主视觉", "案例图库更强"],
    previewClass:
      "bg-[radial-gradient(circle_at_top,rgba(212,177,120,0.34),transparent_46%),linear-gradient(160deg,#1f1b16,#4c3d2b_48%,#f5efe7)]",
  },
  {
    value: "professional_service",
    label: "专业机构型",
    eyebrow: "咨询与服务官网",
    desc: "强调服务能力、交付流程和行业洞察，适合设计机构、顾问团队和供应链服务商。",
    bullets: ["能力矩阵", "资讯与观点", "商务洽谈感更强"],
    previewClass:
      "bg-[radial-gradient(circle_at_top_left,rgba(109,143,173,0.34),transparent_38%),linear-gradient(150deg,#11202e,#213a50_52%,#edf4f8)]",
  },
  {
    value: "simple_elegant",
    label: "轻奢形象型",
    eyebrow: "简洁但不简单",
    desc: "保留企业站该有的层次感，把内容组织得更清楚，适合资料还在逐步完善的企业。",
    bullets: ["留白高级", "信息更清楚", "适合初期建站"],
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

  const coreModules = MODULE_OPTIONS.filter((option) =>
    ["intro", "advantages", "news", "gallery", "contact"].includes(option.key)
  );
  const extendedModules = MODULE_OPTIONS.filter((option) => !["intro", "advantages", "news", "gallery", "contact"].includes(option.key));
  const enabledModules = MODULE_OPTIONS.filter((option) => settings.modules[option.key]);

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
            <h2 className="text-lg font-semibold text-primary">首页文案</h2>
            <p className="mt-1 text-sm text-muted">这三项决定访客第一眼看到的内容，平时主要改这里。</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="首页主标题" value={settings.heroTitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroTitle: value }))} />
              <TextField label="联系按钮文案" value={settings.contactLabel} onChange={(value) => setSettings((prev) => ({ ...prev, contactLabel: value }))} />
            </div>
            <div className="mt-4">
              <TextAreaField label="首页副标题" value={settings.heroSubtitle} onChange={(value) => setSettings((prev) => ({ ...prev, heroSubtitle: value }))} />
            </div>
          </article>

          <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-semibold text-primary">首页展示模块</h2>
            <p className="mt-1 text-sm text-muted">主流网站一般只让你先决定几个最核心模块，其他功能折叠成扩展选项。</p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {coreModules.map((option) => {
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
              <SummaryRow label="联系按钮" value={settings.contactLabel || "联系我们"} />
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
              <li>先定模板，再写首页标题和副标题。</li>
              <li>只保留 4-5 个最重要模块，页面会更高级。</li>
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
