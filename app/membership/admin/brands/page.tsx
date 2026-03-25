"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RichContent } from "@/components/RichContent";
import { RichEditor } from "@/components/RichEditor";
import { toSummaryText } from "@/lib/brand-content";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  isRecommend: boolean;
  isBrandVisible: boolean;
  sortOrder: number;
  rankingWeight: number;
  displayTemplate: string | null;
  memberTypeSnapshot: string | null;
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

type ApiResponse = {
  items: BrandRow[];
  total: number;
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

function buildEnterpriseForm(item: BrandRow | null): EnterpriseForm {
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

function qualityCount(item: BrandRow) {
  return Object.values(item.qualityFlags).filter(Boolean).length;
}

function memberTypeLabel(item: BrandRow) {
  const memberType = item.memberTypeSnapshot || item.enterprise?.member?.memberType || "enterprise_basic";
  if (memberType === "enterprise_advanced") return "VIP 企业";
  if (memberType === "enterprise_basic") return "企业会员";
  return memberType;
}

export default function AdminBrandsPage() {
  const [items, setItems] = useState<BrandRow[]>([]);
  const [q, setQ] = useState("");
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingBrandId, setSavingBrandId] = useState<string | null>(null);
  const [savingEnterprise, setSavingEnterprise] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(EMPTY_FORM);

  const load = useCallback(async (search = "", needsAttention = false) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) params.set("q", search.trim());
    if (needsAttention) params.set("quality", "needs_attention");

    const res = await fetch(`/api/admin/brands?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "品牌列表加载失败");
      setLoading(false);
      return;
    }

    const nextItems = Array.isArray(data.items) ? data.items : [];
    setItems(nextItems);
    setSelectedId((prev) => (prev && nextItems.some((item) => item.id === prev) ? prev : nextItems[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load("", false);
  }, [load]);

  const selectedBrand = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aQuality = qualityCount(a);
        const bQuality = qualityCount(b);
        if (aQuality !== bQuality) return bQuality - aQuality;
        if (a.isRecommend !== b.isRecommend) return a.isRecommend ? -1 : 1;
        if (a.sortOrder !== b.sortOrder) return b.sortOrder - a.sortOrder;
        return b.rankingWeight - a.rankingWeight;
      }),
    [items]
  );
  const previewSummary = useMemo(
    () => toSummaryText(enterpriseForm.positioning || enterpriseForm.intro, 120) || "填写企业定位或简介后，这里会显示前台摘要。",
    [enterpriseForm.intro, enterpriseForm.positioning]
  );

  useEffect(() => {
    setEnterpriseForm(buildEnterpriseForm(selectedBrand));
  }, [selectedBrand]);

  async function updateBrand(id: string, patch: Partial<BrandRow>) {
    setSavingBrandId(id);
    setMessage("");
    const res = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BrandRow> & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "品牌设置更新失败");
      setSavingBrandId(null);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } as BrandRow : item)));
    setSavingBrandId(null);
    setMessage("品牌展示设置已更新。");
  }

  async function saveEnterprise() {
    if (!selectedBrand?.enterprise) return;
    setSavingEnterprise(true);
    setMessage("");

    const res = await fetch(`/api/admin/enterprises/${selectedBrand.enterprise.id}`, {
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

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedBrand.id
          ? {
              ...item,
              enterprise: {
                ...item.enterprise!,
                ...enterpriseForm,
              },
              frontDisplay: {
                ...item.frontDisplay,
                name: enterpriseForm.companyShortName || enterpriseForm.companyName || item.name,
                logoUrl: enterpriseForm.logoUrl || item.frontDisplay.logoUrl || null,
                region: enterpriseForm.region || item.frontDisplay.region || "全国",
                area: enterpriseForm.area || item.frontDisplay.area || null,
                summary: previewSummary,
              },
              qualityFlags: {
                missingLogo: !(enterpriseForm.logoUrl || item.frontDisplay.logoUrl),
                missingSummary: !(enterpriseForm.positioning || enterpriseForm.intro || item.frontDisplay.summary),
                missingContact: !(enterpriseForm.contactPhone || enterpriseForm.website || enterpriseForm.contactInfo),
              },
            }
          : item
      )
    );
    setMessage("企业资料已保存，前台品牌页会立即同步。");
    setSavingEnterprise(false);
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

  if (loading) return <p className="text-muted">加载品牌治理面板中...</p>;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Brand Operations Console</p>
        <h1 className="mt-3 font-serif text-3xl text-primary">品牌前后台治理</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
          这里统一处理“导入品牌数据 → 后台管理 → 前台展示”的主链路。前台真正读取的企业实时字段、品牌推荐状态和数据质量缺口，都会集中展示在这里，方便管理员直接治理。
        </p>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[28px] border border-border bg-surface-elevated p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <form
          className="grid gap-3 lg:grid-cols-[1fr,auto,auto,auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void load(q, onlyNeedsAttention);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-primary"
            placeholder="搜索品牌名、企业名、地区、定位或产品体系"
          />
          <label className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-border bg-surface px-4 text-sm text-primary">
            <input type="checkbox" checked={onlyNeedsAttention} onChange={(event) => setOnlyNeedsAttention(event.target.checked)} />
            只看待治理数据
          </label>
          <button className="h-12 rounded-[18px] bg-accent px-5 text-sm font-medium text-white">搜索</button>
          <button
            type="button"
            className="h-12 rounded-[18px] border border-border px-5 text-sm text-primary hover:bg-white"
            onClick={() => {
              setQ("");
              setOnlyNeedsAttention(false);
              void load("", false);
            }}
          >
            重置
          </button>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="space-y-4">
          {sortedItems.length === 0 ? (
            <div className="rounded-[28px] border border-border bg-surface-elevated p-8 text-sm text-muted">当前没有匹配的品牌数据。</div>
          ) : (
            sortedItems.map((item) => {
              const selected = item.id === selectedId;
              const quality = qualityCount(item);
              return (
                <article
                  key={item.id}
                  className={`rounded-[28px] border p-5 transition ${selected ? "border-accent bg-white shadow-[0_22px_52px_rgba(15,23,42,0.08)]" : "border-border bg-surface-elevated shadow-[0_14px_36px_rgba(15,23,42,0.05)]"}`}
                >
                  <button type="button" onClick={() => setSelectedId(item.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{memberTypeLabel(item)}</p>
                        <h2 className="mt-2 font-serif text-2xl text-primary">{item.frontDisplay.name}</h2>
                        <p className="mt-2 text-sm leading-7 text-muted line-clamp-3">{item.frontDisplay.summary}</p>
                      </div>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-border bg-white">
                        {item.frontDisplay.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveUploadedImageUrl(item.frontDisplay.logoUrl)} alt={`${item.frontDisplay.name} logo`} className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-[11px] text-muted">LOGO</span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border px-2.5 py-1 text-muted">{item.frontDisplay.region}{item.frontDisplay.area ? ` · ${item.frontDisplay.area}` : ""}</span>
                    {item.isRecommend ? <span className="rounded-full bg-accent px-2.5 py-1 text-white">推荐展示</span> : null}
                    {quality > 0 ? <span className="rounded-full border border-[rgba(180,154,107,0.28)] bg-[rgba(255,249,238,0.92)] px-2.5 py-1 text-accent">待治理 {quality} 项</span> : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">资料完整</span>}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ToggleChip label="推荐" checked={item.isRecommend} disabled={savingBrandId === item.id} onChange={(checked) => void updateBrand(item.id, { isRecommend: checked })} />
                    <ToggleChip label="前台显示" checked={item.isBrandVisible} disabled={savingBrandId === item.id} onChange={(checked) => void updateBrand(item.id, { isBrandVisible: checked })} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs text-muted">
                      展示模板
                      <select
                        value={item.displayTemplate ?? "brand_showcase"}
                        onChange={(event) => void updateBrand(item.id, { displayTemplate: event.target.value })}
                        className="mt-1 h-10 w-full rounded-[16px] border border-border bg-surface px-3 text-sm text-primary"
                        disabled={savingBrandId === item.id}
                      >
                        <option value="brand_showcase">品牌旗舰型</option>
                        <option value="professional_service">专业机构型</option>
                        <option value="simple_elegant">轻奢形象型</option>
                      </select>
                    </label>
                    <label className="block text-xs text-muted">
                      排序值
                      <input
                        type="number"
                        value={item.sortOrder}
                        onChange={(event) => setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, sortOrder: Number(event.target.value) } : row)))}
                        onBlur={(event) => void updateBrand(item.id, { sortOrder: Number(event.target.value) })}
                        className="mt-1 h-10 w-full rounded-[16px] border border-border bg-surface px-3 text-sm text-primary"
                        disabled={savingBrandId === item.id}
                      />
                    </label>
                    <label className="block text-xs text-muted">
                      权重
                      <input
                        type="number"
                        value={item.rankingWeight}
                        onChange={(event) => setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, rankingWeight: Number(event.target.value) } : row)))}
                        onBlur={(event) => void updateBrand(item.id, { rankingWeight: Number(event.target.value) })}
                        className="mt-1 h-10 w-full rounded-[16px] border border-border bg-surface px-3 text-sm text-primary"
                        disabled={savingBrandId === item.id}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link href={item.frontDisplay.detailHref} target="_blank" className="apple-inline-link">
                      打开前台详情页
                    </Link>
                    <button type="button" onClick={() => setSelectedId(item.id)} className="text-accent hover:underline">
                      在右侧治理资料
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="space-y-6">
          {selectedBrand?.enterprise ? (
            <>
              <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">治理对象</p>
                    <h2 className="mt-2 font-serif text-2xl text-primary">{selectedBrand.frontDisplay.name}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted">前台真正读取的是右侧这些企业实时字段。品牌快照只做兜底，不再覆盖这里的值。</p>
                  </div>
                  <Link href={selectedBrand.frontDisplay.detailHref} target="_blank" className="apple-inline-link">
                    查看前台效果
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-primary">企业全称</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyName: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">企业简称</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.companyShortName} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, companyShortName: event.target.value }))} />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1fr,0.8fr]">
                  <label className="block">
                    <span className="text-sm font-medium text-primary">企业 Logo</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.logoUrl} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, logoUrl: event.target.value }))} placeholder="填写图片地址或直接上传" />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        {uploadingLogo ? "上传中..." : `上传 Logo（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                      </label>
                      {enterpriseForm.logoUrl ? <button type="button" className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-primary transition hover:bg-white" onClick={() => setEnterpriseForm((prev) => ({ ...prev, logoUrl: "" }))}>清除</button> : null}
                    </div>
                  </label>
                  <div className="rounded-[22px] border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Logo 预览</p>
                    <div className="mt-3 flex h-24 items-center justify-center rounded-[18px] border border-dashed border-border bg-white">
                      {enterpriseForm.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveUploadedImageUrl(enterpriseForm.logoUrl)} alt="Logo 预览" className="max-h-16 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted">暂无 Logo</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-primary">品牌定位</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.positioning} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, positioning: event.target.value }))} placeholder="一句话说清企业是谁、做什么" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">产品体系</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.productSystem} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, productSystem: event.target.value }))} placeholder="如：整木定制、木门墙板、柜类系统" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">所在区域</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.region} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, region: event.target.value }))} placeholder="如：华东" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">省市地区</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.area} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, area: event.target.value }))} placeholder="如：浙江杭州" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">联系人</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPerson} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPerson: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">联系电话</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactPhone} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactPhone: event.target.value }))} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-primary">联系信息</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.contactInfo} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, contactInfo: event.target.value }))} placeholder="如：微信、客服说明、商务邮箱" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">官网</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.website} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, website: event.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">企业地址</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.address} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, address: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">工艺等级</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.craftLevel} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, craftLevel: event.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-primary">认证情况</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.certifications} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, certifications: event.target.value }))} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-primary">获奖记录</span>
                    <input className="mt-2 h-11 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" value={enterpriseForm.awards} onChange={(event) => setEnterpriseForm((prev) => ({ ...prev, awards: event.target.value }))} />
                  </label>
                </div>

                <div className="mt-5">
                  <span className="text-sm font-medium text-primary">企业简介</span>
                  <p className="mt-1 text-xs leading-6 text-muted">支持把旧站内容贴进来，系统会在保存时自动清洗危险标签、内联样式和脏 HTML。</p>
                  <div className="mt-3">
                    <RichEditor value={enterpriseForm.intro} onChange={(value) => setEnterpriseForm((prev) => ({ ...prev, intro: value }))} minHeight={240} placeholder="建议用 2-4 段介绍企业定位、产品体系、服务能力和合作方式。" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" disabled={savingEnterprise || uploadingLogo} onClick={() => void saveEnterprise()} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55">
                    {savingEnterprise ? "保存中..." : "保存企业资料"}
                  </button>
                  <button type="button" className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-primary transition hover:bg-white" onClick={() => setEnterpriseForm(buildEnterpriseForm(selectedBrand))}>
                    恢复当前数据
                  </button>
                </div>
              </section>

              <section className="rounded-[28px] border border-border bg-surface-elevated p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <h2 className="text-lg font-semibold text-primary">前台结果预览</h2>
                <p className="mt-2 text-sm leading-7 text-muted">这部分模拟品牌卡片和详情页会读取的最终展示值，帮助管理员在保存前就判断是否还需要补资料。</p>
                <div className="mt-5 rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8d7a5a]">Front Display</p>
                  <h3 className="mt-3 font-serif text-2xl text-primary">{enterpriseForm.companyShortName || enterpriseForm.companyName || selectedBrand.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{previewSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.region || selectedBrand.frontDisplay.region || "全国"}</span>
                    {enterpriseForm.area ? <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.area}</span> : null}
                    {enterpriseForm.productSystem ? <span className="rounded-full border border-border px-2.5 py-1">{enterpriseForm.productSystem}</span> : null}
                  </div>
                </div>
                <div className="mt-5 rounded-[24px] border border-border bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">简介预览</p>
                  <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[20px] border border-border bg-surface p-4">
                    {enterpriseForm.intro ? <RichContent html={enterpriseForm.intro} className="text-sm leading-7 text-primary" /> : <p className="text-sm text-muted">这里会展示清洗后的企业简介效果。</p>}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[28px] border border-border bg-surface-elevated p-8 text-sm leading-7 text-muted shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              当前选中的品牌未绑定企业，无法进行企业资料治理。请先在品牌记录中补齐企业绑定关系。
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToggleChip({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm ${checked ? "border-[rgba(180,154,107,0.28)] bg-[rgba(255,249,238,0.92)] text-accent" : "border-border bg-surface text-primary"}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
