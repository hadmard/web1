"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RichContent } from "@/components/RichContent";
import { RichEditor } from "@/components/RichEditor";
import { toSummaryText } from "@/lib/brand-content";
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

  const previewSummary = useMemo(
    () => toSummaryText(enterpriseForm.positioning || enterpriseForm.intro, 120) || "填写企业定位或简介后，这里会显示前台摘要。",
    [enterpriseForm.intro, enterpriseForm.positioning]
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
      setLoading(false);
    })();
  }, [id]);

  async function updateBrand(patch: Partial<BrandDetail>) {
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
    setSavingBrand(false);
    setMessage("品牌展示设置已更新。");
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
            },
          }
        : prev
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
  if (!brand || !brand.enterprise) return <p className="text-muted">未找到可治理的品牌详情。</p>;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Detail</p>
            <h1 className="mt-3 font-serif text-3xl text-primary">{brand.frontDisplay.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              这里维护企业实时展示资料。保存后会同步影响前台详情页、品牌总览和推荐品牌卡片。
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
          {issueLabels(brand).length > 0 ? issueLabels(brand).map((label) => <span key={label} className="rounded-full border border-[rgba(181,157,121,0.18)] bg-[rgba(255,249,238,0.92)] px-2.5 py-1 text-accent">{label}</span>) : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">前台资料完整</span>}
          <span className={`rounded-full px-2.5 py-1 ${brand.isBrandVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{brand.isBrandVisible ? "前台显示中" : "前台已隐藏"}</span>
          <span className={`rounded-full px-2.5 py-1 ${brand.isRecommend ? "bg-[rgba(245,236,220,0.85)] text-accent" : "bg-slate-100 text-slate-600"}`}>{brand.isRecommend ? "推荐中" : "普通展示"}</span>
        </div>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={savingBrand} onClick={() => void updateBrand({ isBrandVisible: !brand.isBrandVisible })} className={`rounded-full px-4 py-2 text-sm ${brand.isBrandVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"} ${savingBrand ? "opacity-60" : ""}`}>
            {brand.isBrandVisible ? "前台显示中，点此隐藏" : "当前隐藏，点此前台显示"}
          </button>
          <button type="button" disabled={savingBrand} onClick={() => void updateBrand({ isRecommend: !brand.isRecommend })} className={`rounded-full px-4 py-2 text-sm ${brand.isRecommend ? "bg-[rgba(245,236,220,0.85)] text-accent" : "bg-slate-100 text-slate-600"} ${savingBrand ? "opacity-60" : ""}`}>
            {brand.isRecommend ? "已推荐，点此取消" : "设为推荐品牌"}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="企业全称">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyName: event.target.value }))} />
          </Field>
          <Field label="企业简称">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyShortName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyShortName: event.target.value }))} />
          </Field>
          <Field label="品牌定位">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.positioning} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, positioning: event.target.value }))} />
          </Field>
          <Field label="产品体系">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.productSystem} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, productSystem: event.target.value }))} />
          </Field>
          <Field label="所在区域">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.region} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, region: event.target.value }))} />
          </Field>
          <Field label="省市地区">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.area} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, area: event.target.value }))} />
          </Field>
          <Field label="联系人">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPerson} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPerson: event.target.value }))} />
          </Field>
          <Field label="联系电话">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPhone} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPhone: event.target.value }))} />
          </Field>
          <Field label="联系信息" className="md:col-span-2">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactInfo} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactInfo: event.target.value }))} />
          </Field>
          <Field label="官网">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.website} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, website: event.target.value }))} />
          </Field>
          <Field label="企业地址">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.address} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, address: event.target.value }))} />
          </Field>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr,240px]">
          <Field label="企业 Logo">
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

        <div className="mt-5">
          <span className="text-sm font-medium text-primary">企业简介</span>
          <p className="mt-1 text-xs leading-6 text-muted">支持直接粘贴旧站内容，系统会在保存时自动清洗危险标签、内联样式和脏 HTML。</p>
          <div className="mt-3">
            <RichEditor value={enterpriseForm.intro} onChange={(value) => setEnterpriseForm((prev) => ({ ...prev, intro: value }))} minHeight={240} placeholder="建议用 2-4 段介绍企业定位、产品体系、服务能力和合作方式。" />
          </div>
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

      <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-5 lg:grid-cols-[0.92fr,1.08fr]">
          <div className="rounded-[24px] border border-[rgba(181,157,121,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8d7a5a]">Front Display</p>
            <h3 className="mt-3 font-serif text-2xl text-primary">{enterpriseForm.companyShortName || enterpriseForm.companyName || brand.name}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{previewSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.region || brand.frontDisplay.region || "全国"}</span>
              {enterpriseForm.area ? <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.area}</span> : null}
              {enterpriseForm.productSystem ? <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.productSystem}</span> : null}
            </div>
          </div>
          <div className="rounded-[24px] border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">简介预览</p>
            <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[20px] border border-border bg-white p-4">
              {enterpriseForm.intro ? <RichContent html={enterpriseForm.intro} className="text-sm leading-7 text-primary" /> : <p className="text-sm text-muted">这里会展示清洗后的企业简介效果。</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-primary">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
