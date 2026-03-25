"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RichContent } from "@/components/RichContent";
import { RichEditor } from "@/components/RichEditor";
import { containsSuspiciousText, htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type BrandDetail = {
  id: string;
  name: string;
  slug: string;
  isRecommend: boolean;
  isBrandVisible: boolean;
  sortOrder: number;
  rankingWeight: number;
  displayTemplate: string | null;
  frontDisplay: {
    name: string;
    logoUrl: string | null;
    region: string;
    area: string | null;
    summary: string;
    detailHref: string;
  };
  qualityFlags: {
    missingLogo: boolean;
    missingSummary: boolean;
    missingContact: boolean;
    weakIntro?: boolean;
    suspiciousIntro?: boolean;
  };
  enterprise: {
    id: string;
    memberId: string;
    companyName: string | null;
    companyShortName: string | null;
    intro: string | null;
    logoUrl: string | null;
    region: string | null;
    area: string | null;
    positioning: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    contactInfo: string | null;
    website: string | null;
    address: string | null;
    productSystem: string | null;
    craftLevel: string | null;
    certifications: string | null;
    awards: string | null;
    member?: {
      memberType: string;
      rankingWeight: number;
    } | null;
  } | null;
  enterpriseOptions: Array<{
    id: string;
    companyName: string | null;
    companyShortName: string | null;
    member: {
      name: string | null;
      memberType: string;
    };
  }>;
};

type EnterpriseForm = {
  companyName: string;
  companyShortName: string;
  intro: string;
  logoUrl: string;
  region: string;
  area: string;
  positioning: string;
  contactPerson: string;
  contactPhone: string;
  contactInfo: string;
  website: string;
  address: string;
  productSystem: string;
  craftLevel: string;
  certifications: string;
  awards: string;
};

const EMPTY_FORM: EnterpriseForm = {
  companyName: "",
  companyShortName: "",
  intro: "",
  logoUrl: "",
  region: "",
  area: "",
  positioning: "",
  contactPerson: "",
  contactPhone: "",
  contactInfo: "",
  website: "",
  address: "",
  productSystem: "",
  craftLevel: "",
  certifications: "",
  awards: "",
};

function buildEnterpriseForm(item: BrandDetail | null): EnterpriseForm {
  if (!item?.enterprise) return EMPTY_FORM;
  return {
    companyName: item.enterprise.companyName ?? "",
    companyShortName: item.enterprise.companyShortName ?? "",
    intro: item.enterprise.intro ?? "",
    logoUrl: item.enterprise.logoUrl ?? "",
    region: item.enterprise.region ?? "",
    area: item.enterprise.area ?? "",
    positioning: item.enterprise.positioning ?? "",
    contactPerson: item.enterprise.contactPerson ?? "",
    contactPhone: item.enterprise.contactPhone ?? "",
    contactInfo: item.enterprise.contactInfo ?? "",
    website: item.enterprise.website ?? "",
    address: item.enterprise.address ?? "",
    productSystem: item.enterprise.productSystem ?? "",
    craftLevel: item.enterprise.craftLevel ?? "",
    certifications: item.enterprise.certifications ?? "",
    awards: item.enterprise.awards ?? "",
  };
}

function issueLabels(item: BrandDetail) {
  return [
    item.qualityFlags.missingLogo ? "缺 Logo" : null,
    item.qualityFlags.missingSummary ? "缺摘要" : null,
    item.qualityFlags.missingContact ? "缺联系" : null,
    item.qualityFlags.weakIntro ? "简介过短" : null,
    item.qualityFlags.suspiciousIntro ? "内容待清洗" : null,
  ].filter(Boolean) as string[];
}

export default function AdminBrandDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingEnterprise, setSavingEnterprise] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState("");

  const previewName = useMemo(() => enterpriseForm.companyShortName || enterpriseForm.companyName || brand?.name || "品牌名称", [enterpriseForm.companyName, enterpriseForm.companyShortName, brand?.name]);
  const previewSummary = useMemo(
    () => toSummaryText(enterpriseForm.positioning || enterpriseForm.intro, 120) || "填写企业定位或简介后，这里会显示前台摘要。",
    [enterpriseForm.intro, enterpriseForm.positioning],
  );
  const previewTags = useMemo(
    () => [enterpriseForm.region || brand?.frontDisplay.region || "全国", enterpriseForm.area, enterpriseForm.productSystem, enterpriseForm.craftLevel].filter(Boolean),
    [brand?.frontDisplay.region, enterpriseForm.area, enterpriseForm.craftLevel, enterpriseForm.productSystem, enterpriseForm.region],
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/brands/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as BrandDetail & { error?: string };
      if (!res.ok) {
        setBrand(null);
        setMessage(data.error ?? "品牌详情加载失败");
        setLoading(false);
        return;
      }
      setBrand(data);
      setEnterpriseForm(buildEnterpriseForm(data));
      setSelectedEnterpriseId(data.enterprise?.id ?? "");
      setLoading(false);
    })();
  }, [id]);

  async function updateBrand(patch: {
    isBrandVisible?: boolean;
    isRecommend?: boolean;
    enterpriseId?: string;
  }) {
    if (!brand) return;
    setSavingBrand(true);
    setMessage("");
    const res = await fetch(`/api/admin/brands/${brand.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BrandDetail> & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "品牌设置更新失败");
      setSavingBrand(false);
      return;
    }
    setBrand((prev) => (prev ? ({ ...prev, ...data } as BrandDetail) : prev));
    if (Object.prototype.hasOwnProperty.call(patch, "enterpriseId")) {
      const detailRes = await fetch(`/api/admin/brands/${brand.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const detailData = (await detailRes.json().catch(() => ({}))) as BrandDetail & { error?: string };
      if (detailRes.ok) {
        setBrand(detailData);
        setEnterpriseForm(buildEnterpriseForm(detailData));
        setSelectedEnterpriseId(detailData.enterprise?.id ?? "");
      }
    }
    setSavingBrand(false);
    setMessage("品牌展示设置已更新。前台相关页面会立即同步。");
  }

  async function saveEnterprise() {
    if (!brand?.enterprise) return;
    setSavingEnterprise(true);
    setMessage("");

    const res = await fetch(`/api/admin/enterprises/${brand.enterprise.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enterpriseForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "企业资料保存失败");
      setSavingEnterprise(false);
      return;
    }

    setBrand((prev) =>
      prev
        ? {
            ...prev,
            enterprise: {
              ...prev.enterprise!,
              ...enterpriseForm,
            },
            frontDisplay: {
              ...prev.frontDisplay,
              name: enterpriseForm.companyShortName || enterpriseForm.companyName || prev.name,
              logoUrl: enterpriseForm.logoUrl || prev.frontDisplay.logoUrl || null,
              region: enterpriseForm.region || prev.frontDisplay.region || "全国",
              area: enterpriseForm.area || prev.frontDisplay.area || null,
              summary: previewSummary,
            },
            qualityFlags: {
              missingLogo: !(enterpriseForm.logoUrl || prev.frontDisplay.logoUrl),
              missingSummary: !(enterpriseForm.positioning || enterpriseForm.intro || prev.frontDisplay.summary),
              missingContact: !(enterpriseForm.contactPhone || enterpriseForm.website || enterpriseForm.contactInfo),
              weakIntro: (() => {
                const summaryText = htmlToPlainText(enterpriseForm.positioning || enterpriseForm.intro);
                return summaryText.length > 0 && summaryText.length < 36;
              })(),
              suspiciousIntro: containsSuspiciousText(enterpriseForm.intro || enterpriseForm.positioning),
            },
          }
        : prev,
    );
    setSavingEnterprise(false);
    setMessage("企业资料已保存，前台品牌页会立即同步。");
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setMessage("");
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/enterprise-logos" });
      setEnterpriseForm((prev) => ({ ...prev, logoUrl: imageUrl }));
      setMessage("Logo 已上传，保存后前台会立即更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logo 上传失败");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  if (loading) return <p className="text-muted">加载品牌详情中...</p>;
  if (!brand) return <p className="text-muted">未找到可治理的品牌详情。</p>;

  const qualityItems = issueLabels(brand);

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Detail Studio</p>
            <h1 className="mt-3 font-serif text-3xl text-primary">{brand.frontDisplay.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              这里维护企业实时展示资料。左侧调整前台显示规则，右侧维护 Logo、摘要、简介和联系方式；保存后会同步影响品牌列表页与企业详情页。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/membership/admin/brands" className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface">
              返回品牌列表
            </Link>
            <Link href={brand.frontDisplay.detailHref} target="_blank" className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface">
              查看前台详情
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {qualityItems.length > 0 ? qualityItems.map((label) => <span key={label} className="rounded-full border border-[rgba(181,157,121,0.18)] bg-[rgba(255,249,238,0.92)] px-2.5 py-1 text-accent">{label}</span>) : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">前台资料完整</span>}
          <span className={`rounded-full px-2.5 py-1 ${brand.isBrandVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{brand.isBrandVisible ? "前台显示中" : "前台已隐藏"}</span>
          <span className={`rounded-full px-2.5 py-1 ${brand.isRecommend ? "bg-[rgba(245,236,220,0.85)] text-accent" : "bg-slate-100 text-slate-600"}`}>{brand.isRecommend ? "推荐中" : "普通展示"}</span>
        </div>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">展示控制</h2>
                <p className="mt-2 text-sm text-muted">这组设置只控制前台排序、推荐和是否公开展示。</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-border bg-surface p-5 md:col-span-2">
                <p className="text-sm font-medium text-primary">绑定企业</p>
                <p className="mt-2 text-sm leading-7 text-muted">先把品牌绑定到具体企业，列表页名称、详情页和联系方式才会按企业实时资料展示。</p>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                  <select
                    value={selectedEnterpriseId}
                    onChange={(event) => setSelectedEnterpriseId(event.target.value)}
                    className="h-11 w-full rounded-[16px] border border-border bg-white px-4 text-sm text-primary"
                  >
                    <option value="">请选择企业</option>
                    {brand.enterpriseOptions.map((option) => {
                      const optionLabel =
                        option.companyShortName || option.companyName || option.member.name || option.id;
                      const companyLabel =
                        option.companyName && option.companyName !== optionLabel ? ` / ${option.companyName}` : "";
                      return (
                        <option key={option.id} value={option.id}>
                          {optionLabel}
                          {companyLabel}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    disabled={savingBrand || !selectedEnterpriseId || selectedEnterpriseId === brand.enterprise?.id}
                    onClick={() => void updateBrand({ enterpriseId: selectedEnterpriseId })}
                    className="rounded-full border border-border bg-white px-5 py-2.5 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {brand.enterprise ? "更新绑定企业" : "绑定企业"}
                  </button>
                </div>
              </div>
              <ActionCard
                title="前台显示"
                body="决定这家企业是否出现在 /brands 与 /brands/all。"
                activeLabel={brand.isBrandVisible ? "显示中" : "已隐藏"}
                buttonLabel={brand.isBrandVisible ? "从前台隐藏" : "恢复前台显示"}
                disabled={savingBrand}
                onClick={() => void updateBrand({ isBrandVisible: !brand.isBrandVisible })}
              />
              <ActionCard
                title="推荐展示"
                body="决定是否优先进入推荐品牌位和首页橱窗。"
                activeLabel={brand.isRecommend ? "推荐中" : "普通展示"}
                buttonLabel={brand.isRecommend ? "取消推荐" : "设为推荐"}
                disabled={savingBrand}
                onClick={() => void updateBrand({ isRecommend: !brand.isRecommend })}
              />
            </div>
          </section>

          {brand.enterprise ? (
            <>
              <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div>
                  <h2 className="text-lg font-semibold text-primary">基础信息</h2>
                  <p className="mt-2 text-sm text-muted">企业名称、地区与联系信息会直接影响列表页和详情页基础信息区。</p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="企业全称" helper="详情页标题兜底字段。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyName: event.target.value }))} />
                  </Field>
                  <Field label="企业简称" helper="品牌卡片与详情页主标题优先字段。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyShortName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyShortName: event.target.value }))} />
                  </Field>
                  <Field label="所在区域" helper="影响品牌列表与详情页地区标签。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.region} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, region: event.target.value }))} />
                  </Field>
                  <Field label="省市地区" helper="用于细化到省市或城市。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.area} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, area: event.target.value }))} />
                  </Field>
                  <Field label="联系人">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPerson} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPerson: event.target.value }))} />
                  </Field>
                  <Field label="联系电话" helper="前台 CTA 会优先使用电话。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPhone} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPhone: event.target.value }))} />
                  </Field>
                  <Field label="联系信息" className="md:col-span-2" helper="可填写微信、商务邮箱或其他联系说明。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactInfo} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactInfo: event.target.value }))} />
                  </Field>
                  <Field label="官网">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.website} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, website: event.target.value }))} />
                  </Field>
                  <Field label="企业地址">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.address} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, address: event.target.value }))} />
                  </Field>
                </div>
              </section>

              <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div>
                  <h2 className="text-lg font-semibold text-primary">展示信息</h2>
                  <p className="mt-2 text-sm text-muted">这组字段决定品牌卡片摘要、详情页亮点区和首页推荐位的表现。</p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="品牌定位" helper="列表页摘要与详情页首屏一句话定位优先字段。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.positioning} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, positioning: event.target.value }))} />
                  </Field>
                  <Field label="产品体系" helper="用于补足“做什么”。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.productSystem} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, productSystem: event.target.value }))} />
                  </Field>
                  <Field label="工艺等级">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.craftLevel} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, craftLevel: event.target.value }))} />
                  </Field>
                  <Field label="认证情况">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.certifications} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, certifications: event.target.value }))} />
                  </Field>
                  <Field label="获奖记录" className="md:col-span-2">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.awards} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, awards: event.target.value }))} />
                  </Field>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr,240px]">
                  <Field label="企业 Logo" helper="卡片、推荐位和详情页首屏统一使用这里的图片。">
                    <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.logoUrl} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, logoUrl: event.target.value }))} />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        {uploadingLogo ? "上传中..." : `上传 Logo（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                      </label>
                    </div>
                  </Field>
                  <div className="rounded-[22px] border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Logo 预览</p>
                    <div className="mt-3 flex h-28 items-center justify-center rounded-[18px] border border-dashed border-border bg-white">
                      {enterpriseForm.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveUploadedImageUrl(enterpriseForm.logoUrl)} alt="Logo 预览" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted">暂无 Logo</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div>
                  <h2 className="text-lg font-semibold text-primary">企业简介</h2>
                  <p className="mt-2 text-sm text-muted">支持直接粘贴旧站内容。系统会在保存时自动清洗危险标签、内联样式和脏 HTML，并统一前台展示格式。</p>
                </div>
                <div className="mt-4">
                  <RichEditor value={enterpriseForm.intro} onChange={(value) => setEnterpriseForm((prev) => ({ ...prev, intro: value }))} minHeight={260} placeholder="建议用 2-4 段介绍企业定位、产品体系、服务能力和合作方式。" />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" disabled={savingEnterprise || uploadingLogo} onClick={() => void saveEnterprise()} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55">
                    {savingEnterprise ? "保存中..." : "保存企业资料"}
                  </button>
                  <button type="button" className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-primary transition hover:bg-white" onClick={() => setEnterpriseForm(buildEnterpriseForm(brand))}>
                    恢复当前数据
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <h2 className="text-lg font-semibold text-primary">企业资料</h2>
              <p className="mt-3 text-sm leading-7 text-muted">当前品牌还没有绑定企业，请先在上面的“绑定企业”里选择一家公司，再维护展示资料。</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-primary">前台最终展示预览</h2>
            <p className="mt-2 text-sm text-muted">这里模拟品牌卡片和详情页首屏真正会显示的结果，管理员保存前就能判断前台效果。</p>

            <div className="mt-5 rounded-[24px] border border-[rgba(181,157,121,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8d7a5a]">Front Display</p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(181,157,121,0.18)] bg-white">
                  {enterpriseForm.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveUploadedImageUrl(enterpriseForm.logoUrl)} alt="前台 Logo 预览" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted">LOGO</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-2xl text-primary">{previewName}</h3>
                  <p className="mt-3 text-sm leading-7 text-primary/88">{previewSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                    {previewTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border px-2.5 py-1">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">简介预览</p>
              <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[20px] border border-border bg-white p-4">
                {enterpriseForm.intro ? <RichContent html={enterpriseForm.intro} className="text-sm leading-7 text-primary" /> : <p className="text-sm text-muted">这里会展示清洗后的企业简介效果。</p>}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-primary">数据质量与治理提示</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <p>品牌卡片优先读取企业简称、Logo、地区、品牌定位与简介摘要。</p>
              <p>详情页首屏优先读取企业简称、Logo、品牌定位、联系方式和地区。</p>
              <p>如果旧站内容带有 HTML、样式或空标签，系统会在保存时自动清洗；简介过短或内容异常也会在治理列表里提示。</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              {qualityItems.length > 0 ? qualityItems.map((label) => <span key={label} className="rounded-full border border-[rgba(181,157,121,0.18)] bg-[rgba(255,249,238,0.92)] px-2.5 py-1 text-accent">{label}</span>) : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">当前资料完整</span>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, helper, className = "", children }: { label: string; helper?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-primary">{label}</span>
      {helper ? <p className="mt-1 text-xs leading-6 text-muted">{helper}</p> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ActionCard({ title, body, activeLabel, buttonLabel, disabled, onClick }: { title: string; body: string; activeLabel: string; buttonLabel: string; disabled: boolean; onClick: () => void }) {
  return (
    <div className="rounded-[24px] border border-border bg-surface p-5">
      <p className="text-sm font-medium text-primary">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-accent">当前状态：{activeLabel}</p>
      <button type="button" disabled={disabled} onClick={onClick} className="mt-4 rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50">
        {buttonLabel}
      </button>
    </div>
  );
}
