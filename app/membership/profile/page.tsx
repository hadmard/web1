"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import { RichEditor } from "@/components/RichEditor";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

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

const BASE_FIELDS: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: "region", label: "所属区域", placeholder: "如：华东 / 华南 / 全国" },
  { key: "area", label: "省市地区", placeholder: "如：浙江杭州 / 广东佛山" },
  { key: "contactInfo", label: "联系信息", placeholder: "如：微信、商务邮箱、客服说明" },
  { key: "contactPhone", label: "联系电话", placeholder: "如：400-000-0000 / 13800000000" },
];

const ADVANCED_FIELDS: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: "positioning", label: "品牌定位", placeholder: "一句话说清企业是谁、做什么、适合什么客户。" },
];

const COMPATIBILITY_FIELDS: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  { key: "productSystem", label: "产品体系", placeholder: "如：整木定制、木门墙板、柜类系统" },
  { key: "craftLevel", label: "工艺等级", placeholder: "如：高定交付、柔性定制、木作精装" },
  { key: "certifications", label: "认证情况", placeholder: "如：高新技术企业 / ISO9001" },
  { key: "awards", label: "获奖记录", placeholder: "如：2025 年度推荐品牌" },
  { key: "relatedStandards", label: "关联标准 ID", placeholder: "多个请用逗号分隔" },
  { key: "relatedTerms", label: "关联词条 Slug", placeholder: "多个请用逗号分隔" },
  { key: "relatedBrands", label: "关联品牌 ID", placeholder: "多个请用逗号分隔" },
  { key: "videoUrl", label: "企业视频链接", placeholder: "如：https://..." },
];

function memberTypeLabel(memberType: MemberType | null) {
  if (memberType === "enterprise_advanced") return "企业 VIP 会员";
  if (memberType === "enterprise_basic") return "企业基础会员";
  return "个人会员";
}

function messageTone(message: string) {
  if (!message) return "hidden";
  return /失败|异常|错误/.test(message)
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-[rgba(180,154,107,0.26)] bg-[rgba(255,249,238,0.92)] text-accent";
}

export default function MembershipProfilePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [memberType, setMemberType] = useState<MemberType | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/member/profile", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          setMessage(data.error ?? "加载失败");
          return;
        }
        setAuthed(true);
        const type = (data.member?.memberType ?? "personal") as MemberType;
        setMemberType(type);
        setEnterpriseId(data.enterprise?.id ?? null);
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
  const completionCount = useMemo(() => Object.values(form).filter((value) => value.trim().length > 0).length, [form]);
  const previewHref = enterpriseId ? `/enterprise/${enterpriseId}` : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
      setEnterpriseId(data.id ?? enterpriseId);
      setMessage("企业资料已保存，前台刷新后会立即看到最新结果。");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setMessage("");
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/enterprise-logos" });
      setForm((prev) => ({ ...prev, logoUrl: imageUrl }));
      setMessage("Logo 已上传，保存后前台将立即使用新图片。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logo 上传失败");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
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
        <span className="text-primary">企业资料</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <section className="overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Brand Profile Studio</p>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">企业资料管理</h1>
              <p className="mt-3 text-sm text-muted">当前身份：{memberTypeLabel(memberType)}</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                前台品牌页、品牌总览和企业详情页会优先读取这里的实时字段。“关于品牌”、Logo、地区、联系方式和品牌定位，改这里就是改前台展示结果。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="已填写字段" value={`${completionCount}/15`} />
              <MiniStat label="高级资料" value={isAdvanced ? "已开通" : "未开通"} />
              <MiniStat label="当前状态" value={saving ? "保存中" : message ? "已更新" : "待编辑"} />
            </div>
          </div>
        </div>
      </section>

      {message ? <div className={`rounded-[24px] border px-5 py-4 text-sm ${messageTone(message)}`}>{message}</div> : null}

      {noPermission ? (
        <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-primary">当前账号未开通企业资料编辑</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            个人会员默认不支持企业主体资料维护。如需开通企业展示页、企业站或品牌信息，请先完成企业认证，再由平台开通对应会员能力。
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
        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-primary">前台核心字段</h2>
                  <p className="mt-2 text-sm text-muted">这里的内容直接影响品牌卡片、品牌总览和企业详情页首屏展示。</p>
                </div>
                {previewHref ? (
                  <Link href={previewHref} target="_blank" className="apple-inline-link">
                    查看前台详情页
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-4 text-sm leading-7 text-[rgba(96,78,47,0.92)]">
                前台优先读取规则：Logo、地区、摘要、联系方式优先取企业实时字段；品牌快照只作为兜底，不再覆盖你刚保存的结果。
              </div>

              <div className="mt-5 grid gap-5">
                <label className="block">
                  <span className="text-sm font-medium text-primary">关于品牌</span>
                  <p className="mt-1 text-xs leading-6 text-muted">这里对应前台“关于品牌”正文。支持直接输入清爽正文，也支持粘贴旧站内容。系统会自动清洗危险标签、内联样式和多余嵌套。</p>
                  <div className="mt-3">
                    <RichEditor value={form.intro} onChange={(value) => setForm((prev) => ({ ...prev, intro: value }))} minHeight={260} placeholder="建议用 2-4 段讲清品牌故事、代表产品、服务对象和合作能力。" />
                  </div>
                </label>

                <div className="grid gap-4 md:grid-cols-[1fr,0.82fr]">
                  <label className="block">
                    <span className="text-sm font-medium text-primary">企业 Logo</span>
                    <input
                      className="mt-2 h-12 w-full rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                      value={form.logoUrl}
                      placeholder="填写图片地址，或直接使用下方本地上传"
                      onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        {uploadingLogo ? "上传中..." : `本地上传 Logo（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                      </label>
                      {form.logoUrl ? (
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))} className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white">
                          清除 Logo
                        </button>
                      ) : null}
                    </div>
                  </label>

                  <div className="rounded-[24px] border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Logo 预览</p>
                    <div className="mt-4 flex h-28 items-center justify-center rounded-[20px] border border-dashed border-border bg-white">
                      {form.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveUploadedImageUrl(form.logoUrl)} alt="Logo 预览" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted">保存后前台会使用这里的 Logo</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {BASE_FIELDS.map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-sm font-medium text-primary">{field.label}</span>
                      <input
                        className="mt-2 h-12 w-full rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                        value={form[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {isAdvanced ? (
              <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div>
                  <h2 className="text-lg font-semibold text-primary">品牌定位</h2>
                  <p className="mt-2 text-sm text-muted">这里只保留一个“品牌定位”字段，会展示在前台首屏标题下方的副标题位置。</p>
                </div>
                <div className="mt-5 max-w-xl">
                  {ADVANCED_FIELDS.map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-sm font-medium text-primary">{field.label}</span>
                      <input
                        className="mt-2 h-12 w-full rounded-[22px] border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                        value={form[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-5">
                  <p className="text-sm font-medium text-primary">兼容字段</p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    这些字段不会作为新版企业页的主展示区，但管理员后台、品牌治理、搜索和部分旧逻辑仍可能读取它们。为了不影响已有数据，先保留编辑入口。
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {COMPATIBILITY_FIELDS.map((field) => (
                      <label key={field.key} className="block">
                        <span className="text-sm font-medium text-primary">{field.label}</span>
                        <input
                          className="mt-2 h-12 w-full rounded-[22px] border border-border bg-white px-4 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
                          value={form[field.key]}
                          placeholder={field.placeholder}
                          onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingLogo}
              className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? "保存中..." : "保存企业资料"}
            </button>
          </div>
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
