"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";

type DashboardData = {
  member: {
    type: string;
    label: string;
    rankingWeight: number;
    canManageMembers: boolean;
  };
  authorization: {
    year: number;
    news: { enabled: boolean; annualLimit: number | null; usedCount: number; remainingCount: number | null };
    gallery: { enabled: boolean; annualLimit: number | null; usedCount: number; remainingCount: number | null };
    standardFeedback: { enabled: boolean; usedCount: number };
    recommendation: { enabled: boolean; annualLimit: number; usedCount: number; remainingCount: number };
  };
  quotas: {
    newsPublishLimit: number | null;
    galleryUploadLimit: number | null;
    monthlyRecommendationLimit: number;
  };
  features: {
    supportsEnterpriseProfile: boolean;
    supportsEnterpriseSite: boolean;
    supportsDictionaryContribution: boolean;
    supportsStandardCoBuild: boolean;
    supportsSubAccounts: boolean;
    supportsSeoSettings: boolean;
    canRecommendContent: boolean;
    canUploadGallery: boolean;
    canSubmitStandardFeedback: boolean;
  };
  stats: {
    articles: { total: number; pending: number; approved: number; rejected: number };
    gallery: { total: number; pending: number; approved: number; rejected: number };
    standardFeedback: { total: number; pending: number; approved: number; rejected: number };
  };
  latestVerification: {
    status: string;
    companyName: string;
    reviewNote?: string | null;
    updatedAt: string;
  } | null;
  enterprise: {
    id: string;
    companyName?: string | null;
    companyShortName?: string | null;
    verificationStatus?: string | null;
  } | null;
  siteSettingsSummary: {
    heroTitle: string;
    syncEnabled: boolean;
    enabledModules: number;
  } | null;
};

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

type RecoveryResponse = {
  account?: string;
  recoveryEmail?: string;
  error?: string;
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

const PRIMARY_ACTIONS = [
  { href: "/membership/content/publish?tab=articles", label: "发布资讯", desc: "发布企业资讯、词库或标准相关内容" },
  { href: "/membership/content/gallery", label: "管理图库", desc: "上传案例图、工艺图和空间图" },
  { href: "/membership/content/submissions", label: "已发内容", desc: "查看你已提交的内容和当前状态" },
  { href: "/membership/profile", label: "企业资料", desc: "维护关于品牌、品牌定位和 Logo" },
  { href: "/membership/content/verification", label: "企业认证", desc: "提交或查看企业认证资料" },
  { href: "/membership/content/status", label: "审核记录", desc: "查看待审核、已通过和退回内容" },
];

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

function verificationText(status: string | null | undefined) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  if (status === "pending") return "待审核";
  return "未提交";
}

export default function MemberContentPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [siteSavedSnapshot, setSiteSavedSnapshot] = useState("");
  const [siteMessage, setSiteMessage] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

  const [account, setAccount] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dashboardRes = await fetch("/api/member/dashboard", {
          credentials: "include",
          cache: "no-store",
        });
        const dashboardBody = await dashboardRes.json().catch(() => ({}));
        if (!dashboardRes.ok) {
          if (dashboardRes.status === 401) setAuthed(false);
          setMessage(dashboardBody.error ?? "加载失败");
          return;
        }

        setAuthed(true);
        setData(dashboardBody);

        const [siteRes, recoveryRes] = await Promise.all([
          fetch("/api/member/site-settings", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/auth/recovery-email", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const siteBody = await siteRes.json().catch(() => ({}));
        if (siteRes.ok) {
          const nextSettings = normalizeSettings(siteBody.settings ?? EMPTY_SETTINGS);
          setSiteSettings(nextSettings);
          setSiteSavedSnapshot(JSON.stringify(nextSettings));
        }

        const recoveryBody = (await recoveryRes.json().catch(() => ({}))) as RecoveryResponse;
        if (recoveryRes.ok) {
          setAccount(typeof recoveryBody.account === "string" ? recoveryBody.account : "");
          setRecoveryEmail(typeof recoveryBody.recoveryEmail === "string" ? recoveryBody.recoveryEmail : "");
        }
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verification = useMemo(
    () => verificationText(data?.latestVerification?.status),
    [data?.latestVerification?.status]
  );
  const siteSnapshot = useMemo(() => JSON.stringify(siteSettings), [siteSettings]);
  const hasUnsavedSiteChanges = siteSnapshot !== siteSavedSnapshot;

  async function handleHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingHeroImage(true);
    setSiteMessage("");
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/enterprise-hero" });
      setSiteSettings((prev) => ({ ...prev, heroImageUrl: imageUrl }));
      setSiteMessage("主视觉图已上传，保存后前台生效。");
    } catch (error) {
      setSiteMessage(error instanceof Error ? error.message : "主视觉图上传失败");
    } finally {
      setUploadingHeroImage(false);
      event.target.value = "";
    }
  }

  async function handleSaveSite() {
    setSavingSite(true);
    setSiteMessage("正在保存...");
    try {
      const payload = normalizeSettings(siteSettings);
      const res = await fetch("/api/member/site-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSiteMessage(body.error ?? "保存失败");
        return;
      }
      const nextSettings = normalizeSettings(body.settings ?? payload);
      setSiteSettings(nextSettings);
      setSiteSavedSnapshot(JSON.stringify(nextSettings));
      setSiteMessage("企业主页配置已保存");
    } catch {
      setSiteMessage("网络异常，请稍后重试");
    } finally {
      setSavingSite(false);
    }
  }

  async function handleRecoveryEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingRecovery) return;

    setLoadingRecovery(true);
    setSecurityMessage("");
    setSecurityError("");
    try {
      const response = await fetch("/api/auth/recovery-email", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryEmail }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSecurityError(body.error ?? "保存找回邮箱失败");
        return;
      }
      setRecoveryEmail(typeof body.recoveryEmail === "string" ? body.recoveryEmail : "");
      setSecurityMessage(body.recoveryEmail ? "找回邮箱已保存" : "找回邮箱已清空");
    } catch {
      setSecurityError("网络异常，请稍后重试");
    } finally {
      setLoadingRecovery(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingPassword) return;

    setSecurityMessage("");
    setSecurityError("");

    if (newPassword !== confirmPassword) {
      setSecurityError("两次输入的新密码不一致");
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSecurityError(body.error ?? "修改密码失败");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecurityMessage("密码已更新");
    } catch {
      setSecurityError("网络异常，请稍后重试");
    } finally {
      setLoadingPassword(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后进入会员后台。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">{message || "加载失败"}</div>;
  }

  const displayName = data.enterprise?.companyShortName || data.enterprise?.companyName || "当前会员";
  const newsQuota = data.authorization.news.enabled
    ? data.authorization.news.annualLimit == null
      ? "不限"
      : `${data.authorization.news.remainingCount ?? 0}/${data.authorization.news.annualLimit}`
    : "未开通";
  const galleryQuota = data.authorization.gallery.enabled
    ? data.authorization.gallery.annualLimit == null
      ? "不限"
      : `${data.authorization.gallery.remainingCount ?? 0}/${data.authorization.gallery.annualLimit}`
    : "未开通";

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:space-y-6 sm:px-4 sm:py-12">
      <section className="overflow-hidden rounded-[26px] border border-border bg-surface-elevated shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Member Workbench</p>
              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary sm:mt-3 sm:text-3xl">会员后台工作台</h1>
              <p className="mt-2 text-sm text-muted">{displayName} · {data.member.label}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">内容发布、企业主页配置、账号安全都收在这里，减少来回切页。</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <HeroMiniCard label="资讯额度" value={newsQuota} />
              <HeroMiniCard label="图库额度" value={galleryQuota} />
              <HeroMiniCard label="认证状态" value={verification} />
            </div>
          </div>
        </div>
      </section>

      <section id="publish-center" className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">内容发布中心</h2>
            <p className="mt-1 text-sm text-muted">发布、图库、审核和企业资料入口都放在这里。</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <AnchorLink href="#site-settings" label="主页配置" />
            <AnchorLink href="#account-security" label="账号安全" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:mt-5 md:grid-cols-2 xl:grid-cols-3">
          {PRIMARY_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[20px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.86))] px-4 py-4 transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-5 sm:py-5"
            >
              <p className="text-[15px] font-medium text-primary sm:text-base">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <StatCard label="资讯内容" value={data.stats.articles.total} sub={`待审核 ${data.stats.articles.pending} · 已通过 ${data.stats.articles.approved}`} />
        <StatCard label="图库内容" value={data.stats.gallery.total} sub={`待审核 ${data.stats.gallery.pending} · 已通过 ${data.stats.gallery.approved}`} />
        <StatCard label="标准反馈" value={data.stats.standardFeedback.total} sub={`待审核 ${data.stats.standardFeedback.pending} · 已通过 ${data.stats.standardFeedback.approved}`} />
        <StatCard label="推荐额度" value={data.authorization.recommendation.remainingCount} sub={`全年 ${data.authorization.recommendation.annualLimit} 次`} />
      </section>

      {data.features.supportsEnterpriseSite ? (
        <section id="site-settings" className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">企业主页配置</h2>
              <p className="mt-1 text-sm text-muted">这里集中维护首屏、联系信息和搜索分享设置。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/membership/profile" className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white">
                企业资料
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:mt-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <Field label="企业名称" value={siteSettings.heroTitle} onChange={(value) => setSiteSettings((prev) => ({ ...prev, heroTitle: value }))} />
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard title="品牌定位" text="显示在首页头图副标题。请到企业资料里填写。" actionHref="/membership/profile" actionLabel="去填写" />
                <InfoCard title="关于品牌" text="企业主页正文直接读取企业资料。" actionHref="/membership/profile" actionLabel="去填写" />
              </div>
              <Field
                label="品牌标签"
                value={siteSettings.homepageTags.join(", ")}
                onChange={(value) =>
                  setSiteSettings((prev) => ({
                    ...prev,
                    homepageTags: value
                      .split(/[,，]/)
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .slice(0, 6),
                  }))
                }
              />
            </div>

            <div className="rounded-[20px] border border-border bg-white/90 p-4 sm:rounded-[24px] sm:p-5">
              <p className="text-sm font-medium text-primary">首屏主视觉图</p>
              <input
                className="mt-3 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                value={siteSettings.heroImageUrl}
                onChange={(e) => setSiteSettings((prev) => ({ ...prev, heroImageUrl: e.target.value }))}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                  <input type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                  {uploadingHeroImage ? "上传中..." : `上传图片（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                </label>
                {siteSettings.heroImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setSiteSettings((prev) => ({ ...prev, heroImageUrl: "" }))}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white"
                  >
                    清除图片
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs leading-6 text-muted">建议使用 1600 × 900 px 横图，画面简洁，避免大段文字。</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="主按钮文案"
              value={siteSettings.primaryCtaLabel}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, primaryCtaLabel: value, contactLabel: value }))}
            />
            <Field
              label="次按钮文案"
              value={siteSettings.secondaryCtaLabel}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, secondaryCtaLabel: value }))}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="联系人"
              value={siteSettings.contact.contactPerson}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPerson: value } }))}
            />
            <Field
              label="电话"
              value={siteSettings.contact.contactPhone}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactPhone: value } }))}
            />
            <Field
              label="官网"
              value={siteSettings.contact.websiteUrl}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, websiteUrl: value } }))}
            />
            <Field
              label="城市"
              value={siteSettings.contact.city}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, city: value } }))}
            />
            <Field
              label="地址"
              value={siteSettings.contact.address}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, address: value } }))}
            />
            <Field
              label="表单链接"
              value={siteSettings.contact.contactFormUrl}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactFormUrl: value } }))}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextAreaField
              label="联系引导文案"
              value={siteSettings.contact.contactIntro}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, contact: { ...prev.contact, contactIntro: value } }))}
            />
            <TextAreaField
              label="SEO 描述"
              value={siteSettings.seo.description}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="SEO 标题"
              value={siteSettings.seo.title}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))}
            />
            <Field
              label="分享封面图"
              value={siteSettings.seo.imageUrl}
              onChange={(value) => setSiteSettings((prev) => ({ ...prev, seo: { ...prev.seo, imageUrl: value } }))}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">{siteMessage || "保存后企业主页会使用最新配置。"}</p>
            <button
              type="button"
              onClick={() => void handleSaveSite()}
              disabled={savingSite || uploadingHeroImage || !hasUnsavedSiteChanges}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(180,154,107,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-2.5"
            >
              {savingSite ? "保存中..." : uploadingHeroImage ? "上传中..." : hasUnsavedSiteChanges ? "保存主页配置" : "已保存"}
            </button>
          </div>
        </section>
      ) : null}

      <section id="account-security" className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">账号安全</h2>
            <p className="mt-1 text-sm text-muted">管理找回邮箱和登录密码。</p>
          </div>
          {account ? <p className="text-sm text-muted">当前账号：{account}</p> : null}
        </div>
        {securityError ? <p className="mt-4 text-sm text-red-600">{securityError}</p> : null}
        {securityMessage ? <p className="mt-4 text-sm text-emerald-700">{securityMessage}</p> : null}

        <div className="mt-5 grid gap-4 sm:gap-6 xl:grid-cols-[1fr_1.1fr]">
          <form onSubmit={handleRecoveryEmailSubmit} className="rounded-[20px] border border-border bg-white/90 p-4 sm:rounded-[24px] sm:p-5">
            <h3 className="text-base font-medium text-primary">找回邮箱</h3>
            <p className="mt-2 text-sm text-muted">忘记密码时，系统会把重置链接发到这里。</p>
            <label className="mt-4 block">
              <span className="text-sm text-primary">邮箱地址</span>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
              />
            </label>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loadingRecovery}
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(180,154,107,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-2.5"
              >
                {loadingRecovery ? "保存中..." : "保存找回邮箱"}
              </button>
            </div>
          </form>

          <form onSubmit={handlePasswordSubmit} className="rounded-[20px] border border-border bg-white/90 p-4 sm:rounded-[24px] sm:p-5">
            <h3 className="text-base font-medium text-primary">修改密码</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="当前密码" type="password" value={currentPassword} onChange={setCurrentPassword} />
              <Field label="新密码" type="password" value={newPassword} onChange={setNewPassword} />
              <Field label="确认新密码" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(180,154,107,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-2.5"
              >
                {loadingPassword ? "提交中..." : "更新密码"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function HeroMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:px-4 sm:py-4 sm:shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-primary sm:mt-3 sm:text-lg">{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <article className="rounded-[20px] border border-border bg-surface-elevated p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-5 sm:shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">{value}</p>
      <p className="mt-2 text-[11px] leading-5 text-muted sm:text-xs">{sub}</p>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <input
        type={type}
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

function InfoCard({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-[20px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-4 text-sm leading-6 text-muted sm:rounded-[24px] sm:p-5 sm:leading-7">
      <p className="font-medium text-primary">{title}</p>
      <p className="mt-2">{text}</p>
      <div className="mt-3">
        <Link href={actionHref} className="apple-inline-link">
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

function AnchorLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="rounded-full border border-border bg-surface px-3 py-2 text-xs text-primary transition hover:bg-white">
      {label}
    </a>
  );
}
