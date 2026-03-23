"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type MemberType = "enterprise_basic" | "personal" | "enterprise_advanced";

type FormState = {
  intro: string;
  logoUrl: string;
  region: string;
  area: string;
  contactInfo: string;
  contactPhone: string;
  positioning: string;
  productSystem: string;
  craftLevel: string;
  certifications: string;
  awards: string;
  relatedStandards: string;
  relatedTerms: string;
  relatedBrands: string;
  videoUrl: string;
};

const EMPTY_FORM: FormState = {
  intro: "",
  logoUrl: "",
  region: "",
  area: "",
  contactInfo: "",
  contactPhone: "",
  positioning: "",
  productSystem: "",
  craftLevel: "",
  certifications: "",
  awards: "",
  relatedStandards: "",
  relatedTerms: "",
  relatedBrands: "",
  videoUrl: "",
};

const BASE_FIELDS: Array<{
  key: keyof FormState;
  label: string;
  placeholder: string;
  type?: "textarea";
}> = [
  { key: "intro", label: "企业介绍", placeholder: "用 2 到 3 段讲清企业定位、主营方向与核心特色。", type: "textarea" },
  { key: "logoUrl", label: "企业 Logo", placeholder: "填写企业 Logo 图片地址" },
  { key: "region", label: "所属区域", placeholder: "如：华东 / 浙江" },
  { key: "area", label: "省市区", placeholder: "如：浙江省 杭州市 余杭区" },
  { key: "contactInfo", label: "联系方式", placeholder: "如：微信 / 官网 / 联系邮箱" },
  { key: "contactPhone", label: "联系电话", placeholder: "如：400-000-0000 / 13800000000" },
];

const ADVANCED_FIELDS: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: "positioning", label: "企业定位", placeholder: "如：高定整木系统解决方案服务商" },
  { key: "productSystem", label: "产品体系", placeholder: "如：整木定制、木门墙柜、护墙系统" },
  { key: "craftLevel", label: "工艺等级", placeholder: "如：高定交付、柔性定制、木作精装" },
  { key: "certifications", label: "认证情况", placeholder: "如：高新技术企业 / ISO9001" },
  { key: "awards", label: "获奖记录", placeholder: "如：华点榜 2025 年度推荐品牌" },
  { key: "relatedStandards", label: "关联标准 ID", placeholder: "多个请用逗号分隔" },
  { key: "relatedTerms", label: "关联词条 Slug", placeholder: "多个请用逗号分隔" },
  { key: "relatedBrands", label: "关联品牌 ID", placeholder: "多个请用逗号分隔" },
  { key: "videoUrl", label: "企业视频链接", placeholder: "填写企业视频或品牌片链接" },
];

function memberTypeLabel(memberType: MemberType | null) {
  if (memberType === "enterprise_advanced") return "企业 VIP 会员";
  if (memberType === "enterprise_basic") return "企业基础会员";
  return "个人会员";
}

export default function MembershipProfilePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [memberType, setMemberType] = useState<MemberType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/member/profile", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          setMessage(data.error ?? "加载失败");
          return;
        }
        setAuthed(true);

        const type = (data.member?.memberType ?? "personal") as MemberType;
        setMemberType(type);
        setForm({
          ...EMPTY_FORM,
          intro: data.enterprise?.intro ?? "",
          logoUrl: data.enterprise?.logoUrl ?? "",
          region: data.enterprise?.region ?? "",
          area: data.enterprise?.area ?? "",
          contactInfo: data.enterprise?.contactInfo ?? "",
          contactPhone: data.enterprise?.contactPhone ?? "",
          positioning: data.enterprise?.positioning ?? "",
          productSystem: data.enterprise?.productSystem ?? "",
          craftLevel: data.enterprise?.craftLevel ?? "",
          certifications: data.enterprise?.certifications ?? "",
          awards: data.enterprise?.awards ?? "",
          relatedStandards: data.enterprise?.relatedStandards ?? "",
          relatedTerms: data.enterprise?.relatedTerms ?? "",
          relatedBrands: data.enterprise?.relatedBrands ?? "",
          videoUrl: data.enterprise?.videoUrl ?? "",
        });
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isAdvanced = memberType === "enterprise_advanced";
  const noPermission = memberType === "personal";
  const completionCount = useMemo(
    () => Object.values(form).filter((value) => value.trim().length > 0).length,
    [form]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (noPermission) return;

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/member/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }
      setMessage("企业资料已保存");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后管理企业资料。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <Link href="/membership/content" className="hover:text-accent">会员后台</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">基础资料</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Profile Studio</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">企业资料管理</h1>
              <p className="mt-3 text-sm text-muted">
                当前身份：{memberTypeLabel(memberType)}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                这页只保留主流后台最常用的资料项，先把企业介绍、联系信息和展示资料收完整，前台企业站会直接读取这些内容。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="已填写字段" value={`${completionCount}/15`} />
              <MiniStat label="高级资料" value={isAdvanced ? "已开通" : "未开通"} />
              <MiniStat label="保存状态" value={saving ? "保存中" : message ? "已更新" : "待编辑"} />
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[24px] border border-[rgba(180,154,107,0.26)] bg-[rgba(255,249,238,0.92)] px-5 py-4 text-sm text-accent">
          {message}
        </div>
      ) : null}

      {noPermission ? (
        <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">当前账号未开通企业资料编辑</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            个人会员默认不支持企业主体资料维护。如果你需要开通企业展示页、企业站或品牌信息，请先提交企业认证，再由平台开通对应会员能力。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/membership/content/verification" className="apple-inline-link">
              去提交企业认证
            </Link>
            <Link href="/membership/content" className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white">
              返回会员后台
            </Link>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <section className="space-y-4 rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div>
              <h2 className="text-lg font-semibold text-primary">基础资料</h2>
              <p className="mt-2 text-sm text-muted">先把企业介绍、地区、联系方式这些高频信息维护完整，企业站和品牌页都会优先读取。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {BASE_FIELDS.map((field) => (
                <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : "block"}>
                  <span className="text-sm font-medium text-primary">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      className="mt-2 min-h-32 w-full rounded-[22px] border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="mt-2 h-12 w-full rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-primary">资料摘要</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="会员类型" value={memberTypeLabel(memberType)} />
                <SummaryRow label="企业介绍" value={form.intro.trim() ? "已填写" : "待补充"} />
                <SummaryRow label="联系方式" value={form.contactInfo.trim() || "待补充"} />
                <SummaryRow label="联系电话" value={form.contactPhone.trim() || "待补充"} />
                <SummaryRow label="地区信息" value={form.area.trim() || form.region.trim() || "待补充"} />
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-primary">保存建议</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
                <li>企业介绍建议控制在 150 到 300 字之间，便于首页和搜索摘要展示。</li>
                <li>联系方式尽量写微信、官网或商务邮箱，方便会员站直接展示。</li>
                <li>Logo 建议使用稳定图片地址，避免前台企业站读取失败。</li>
              </ul>
              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving ? "保存中..." : "保存资料"}
              </button>
            </section>
          </aside>

          {isAdvanced ? (
            <section className="xl:col-span-2 rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div>
                <h2 className="text-lg font-semibold text-primary">高级资料</h2>
                <p className="mt-2 text-sm text-muted">企业 VIP 会员可以补充更多品牌力和行业关联信息，前台企业站会获得更完整的展示层次。</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ADVANCED_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-sm font-medium text-primary">{field.label}</span>
                    <input
                      className="mt-2 h-12 w-full rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </form>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/74 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-primary">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] text-right text-primary">{value}</span>
    </div>
  );
}
