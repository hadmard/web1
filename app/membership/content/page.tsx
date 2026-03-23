"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const PRIMARY_ACTIONS = [
  { href: "/membership/content/publish?tab=articles", label: "发布内容", desc: "去资讯、词库、标准等栏目投稿" },
  { href: "/membership/profile", label: "基础资料", desc: "维护企业简介、标签和联系方式" },
  { href: "/membership/content/site", label: "会员站设置", desc: "设置模板、首页文案和模块开关" },
  { href: "/membership/content/verification", label: "企业认证", desc: "提交或修改认证资料，查看审核结果" },
];

const SECONDARY_ACTIONS = [
  { href: "/membership/content/status", label: "审核记录" },
  { href: "/membership/content/news", label: "资讯管理" },
  { href: "/membership/content/gallery", label: "图库入口" },
];

function verificationText(status: string | null | undefined) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  if (status === "pending") return "待审核";
  return "未提交";
}

export default function MemberContentPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/member/dashboard", {
          credentials: "include",
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          setMessage(body.error ?? "加载失败");
          return;
        }
        setAuthed(true);
        setData(body);
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
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Member Console</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-primary">会员后台</h1>
              <p className="mt-3 text-sm text-muted">
                {displayName} · {data.member.label}
              </p>
              <p className="mt-2 text-sm text-muted">
                把常用操作收进一个工作台里：资料、认证、发布、会员站，都从这里进。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMiniCard label="资讯额度" value={newsQuota} />
              <HeroMiniCard label="图库额度" value={galleryQuota} />
              <HeroMiniCard label="认证状态" value={verification} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">常用操作</h2>
              <p className="mt-1 text-sm text-muted">主流后台更像一个工作台，不需要你先分辨一堆页面。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SECONDARY_ACTIONS.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-primary transition hover:bg-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {PRIMARY_ACTIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.86))] px-5 py-5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
              >
                <p className="text-base font-medium text-primary">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">账号状态</h2>
          <div className="mt-4 space-y-3">
            <InfoRow label="授权年度" value={String(data.authorization.year)} />
            <InfoRow label="会员站标题" value={data.siteSettingsSummary?.heroTitle || "未设置"} />
            <InfoRow label="会员站模块" value={`${data.siteSettingsSummary?.enabledModules ?? 0} 个`} />
            <InfoRow label="认证状态" value={verification} />
            <InfoRow label="词库共建" value={data.features.supportsDictionaryContribution ? "已开通" : "未开通"} />
            <InfoRow label="标准参与" value={data.features.supportsStandardCoBuild ? "已开通" : "未开通"} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="资讯内容" value={data.stats.articles.total} sub={`待审核 ${data.stats.articles.pending} · 已通过 ${data.stats.articles.approved}`} />
        <StatCard label="图库内容" value={data.stats.gallery.total} sub={`待审核 ${data.stats.gallery.pending} · 已通过 ${data.stats.gallery.approved}`} />
        <StatCard label="标准反馈" value={data.stats.standardFeedback.total} sub={`待审核 ${data.stats.standardFeedback.pending} · 已通过 ${data.stats.standardFeedback.approved}`} />
        <StatCard label="推荐额度" value={data.authorization.recommendation.remainingCount} sub={`全年 ${data.authorization.recommendation.annualLimit} 次`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <FeaturePanel
          title="企业展示"
          items={[
            { label: "企业资料维护", enabled: data.features.supportsEnterpriseProfile },
            { label: "会员站设置", enabled: data.features.supportsEnterpriseSite },
            { label: "SEO 设置", enabled: data.features.supportsSeoSettings },
            { label: "同步扩展", enabled: Boolean(data.siteSettingsSummary?.syncEnabled) },
          ]}
        />
        <FeaturePanel
          title="内容权限"
          items={[
            { label: "资讯发布", enabled: data.authorization.news.enabled },
            { label: "图库上传", enabled: data.features.canUploadGallery },
            { label: "词库共建", enabled: data.features.supportsDictionaryContribution },
            { label: "标准反馈", enabled: data.features.canSubmitStandardFeedback },
          ]}
        />
        <FeaturePanel
          title="成长权益"
          items={[
            { label: "推荐位资格", enabled: data.features.canRecommendContent },
            { label: "排序加权", enabled: true },
            { label: "信用沉淀", enabled: true },
            { label: "子账号管理", enabled: data.features.supportsSubAccounts },
          ]}
        />
      </section>
    </div>
  );
}

function HeroMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border bg-white/85 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <article className="rounded-[26px] border border-border bg-surface-elevated p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.84))] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-primary">{value}</span>
    </div>
  );
}

function FeaturePanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; enabled: boolean }>;
}) {
  return (
    <article className="rounded-[26px] border border-border bg-surface-elevated p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between rounded-[20px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.84))] px-3 py-2">
            <span className="text-muted">{item.label}</span>
            <span className={item.enabled ? "text-accent" : "text-muted/80"}>{item.enabled ? "已开通" : "未开通"}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
