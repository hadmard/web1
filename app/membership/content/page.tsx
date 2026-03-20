"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const QUICK_LINKS = [
  { href: "/membership/profile", label: "基础信息管理", desc: "维护企业资料、标签、联系信息" },
  { href: "/membership/content/site", label: "会员站管理", desc: "设置会员站首页模块、SEO 与同步项" },
  { href: "/membership/content/publish?tab=articles", label: "内容发布", desc: "发布资讯、词库、标准等内容" },
  { href: "/membership/content/status", label: "审核与参与记录", desc: "查看投稿、标准反馈、认证状态" },
  { href: "/membership/content/verification", label: "企业认证", desc: "提交企业认证并跟踪审核状态" },
];

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

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后进入会员后台。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-6xl mx-auto px-4 py-12 text-sm text-muted">{message || "加载失败"}</div>;
  }

  const isEnterprise = data.member.type !== "personal";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
      <header className="rounded-3xl border border-border bg-surface-elevated p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted">会员后台</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">会员成长驾驶舱</h1>
            <p className="mt-3 text-sm text-muted">
              当前会员类型：{data.member.label}
              {data.enterprise?.companyShortName || data.enterprise?.companyName
                ? ` · ${data.enterprise.companyShortName || data.enterprise.companyName}`
                : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            <p>当前年份：{data.authorization.year}</p>
            <p>资讯剩余：{data.authorization.news.enabled ? (data.authorization.news.annualLimit == null ? "不限" : `${data.authorization.news.remainingCount ?? 0}/${data.authorization.news.annualLimit}`) : "未开通"}</p>
            <p>图库剩余：{data.authorization.gallery.enabled ? (data.authorization.gallery.annualLimit == null ? "不限" : `${data.authorization.gallery.remainingCount ?? 0}/${data.authorization.gallery.annualLimit}`) : "未开通"}</p>
            <p>展示权重：{data.member.rankingWeight}</p>
            <p>资讯额度：{data.quotas.newsPublishLimit == null ? "不限" : `${data.quotas.newsPublishLimit} 篇`}</p>
            <p>推荐额度：{data.quotas.monthlyRecommendationLimit} 篇 / 月</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="资讯内容" value={data.stats.articles.total} sub={`待审 ${data.stats.articles.pending} · 通过 ${data.stats.articles.approved}`} />
        <StatCard label="图库内容" value={data.stats.gallery.total} sub={`待审 ${data.stats.gallery.pending} · 通过 ${data.stats.gallery.approved}`} />
        <StatCard label="标准参与" value={data.stats.standardFeedback.total} sub={`待审 ${data.stats.standardFeedback.pending} · 通过 ${data.stats.standardFeedback.approved}`} />
        <StatCard
          label="会员站模块"
          value={data.siteSettingsSummary?.enabledModules ?? 0}
          sub={data.siteSettingsSummary?.syncEnabled ? "同步已开启" : "同步未开启"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <article className="rounded-3xl border border-border bg-surface-elevated p-6">
          <h2 className="text-lg font-semibold text-primary">功能入口</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-border bg-surface px-4 py-4 transition hover:border-accent/30 hover:shadow-sm">
                <p className="text-sm font-medium text-primary">{item.label}</p>
                <p className="mt-1 text-xs text-muted">{item.desc}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-surface-elevated p-6">
          <h2 className="text-lg font-semibold text-primary">状态提醒</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <InfoRow label="当前授权年度" value={String(data.authorization.year)} />
            <InfoRow label="标准反馈" value={data.features.canSubmitStandardFeedback ? `已开通 · 本年 ${data.authorization.standardFeedback.usedCount}` : "未开通"} />
            <InfoRow label="企业认证" value={data.latestVerification ? data.latestVerification.status : "未提交"} />
            <InfoRow label="会员站标题" value={data.siteSettingsSummary?.heroTitle || "未设置"} />
            <InfoRow label="企业资料" value={isEnterprise ? "可维护" : "个人会员不适用"} />
            <InfoRow label="词库共建" value={data.features.supportsDictionaryContribution ? "已开通" : "未开通"} />
            <InfoRow label="标准共建" value={data.features.supportsStandardCoBuild ? "已开通" : "未开通"} />
            <InfoRow label="子账号管理" value={data.features.supportsSubAccounts ? "已开通" : "暂未开通"} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <FeaturePanel
          title="企业后台"
          items={[
            { label: "基础信息维护", enabled: data.features.supportsEnterpriseProfile },
            { label: "会员站模块设置", enabled: data.features.supportsEnterpriseSite },
            { label: "SEO 设置", enabled: data.features.supportsSeoSettings },
            { label: "同步扩展", enabled: isEnterprise },
          ]}
        />
        <FeaturePanel
          title="内容与审核"
          items={[
            { label: "资讯发布审核", enabled: true },
            { label: "图库发布审核", enabled: isEnterprise },
            { label: "词库共建", enabled: data.features.supportsDictionaryContribution },
            { label: "标准建议", enabled: data.features.supportsStandardCoBuild },
          ]}
        />
        <FeaturePanel
          title="成长与展示"
          items={[
            { label: "推荐位资格", enabled: data.features.canRecommendContent },
            { label: "优先展示", enabled: true },
            { label: "行业信用沉淀", enabled: true },
            { label: "搜索排序加权", enabled: true },
          ]}
        />
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <article className="rounded-3xl border border-border bg-surface-elevated p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
      <span>{label}</span>
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
    <article className="rounded-3xl border border-border bg-surface-elevated p-5">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2">
            <span className="text-muted">{item.label}</span>
            <span className={item.enabled ? "text-accent" : "text-muted/80"}>{item.enabled ? "已开通" : "未开通"}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

