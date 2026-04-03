"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RichEditor } from "@/components/RichEditor";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type EnterpriseDetail = {
  id: string;
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
  verificationStatus: string;
  member: {
    name: string | null;
    email: string;
    memberType: string;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    isBrandVisible: boolean;
  } | null;
  frontDisplay: {
    name: string;
    summary: string;
    detailHref: string;
  };
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

function buildForm(data: EnterpriseDetail | null): EnterpriseForm {
  if (!data) return EMPTY_FORM;
  return {
    companyName: data.companyName ?? "",
    companyShortName: data.companyShortName ?? "",
    intro: data.intro ?? "",
    logoUrl: data.logoUrl ?? "",
    region: data.region ?? "",
    area: data.area ?? "",
    positioning: data.positioning ?? "",
    contactPerson: data.contactPerson ?? "",
    contactPhone: data.contactPhone ?? "",
    contactInfo: data.contactInfo ?? "",
    website: data.website ?? "",
    address: data.address ?? "",
    productSystem: data.productSystem ?? "",
    craftLevel: data.craftLevel ?? "",
    certifications: data.certifications ?? "",
    awards: data.awards ?? "",
  };
}

export default function AdminEnterpriseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [form, setForm] = useState<EnterpriseForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/enterprises/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as EnterpriseDetail & { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "企业详情加载失败");
        setLoading(false);
        return;
      }
      setEnterprise(data);
      setForm(buildForm(data));
      setLoading(false);
    })();
  }, [id]);

  async function saveEnterprise() {
    if (!enterprise) return;
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/admin/enterprises/${enterprise.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? "企业保存失败");
      setSaving(false);
      return;
    }

    setEnterprise((prev) =>
      prev
        ? {
            ...prev,
            ...form,
            frontDisplay: {
              ...prev.frontDisplay,
              name: form.companyShortName || form.companyName || prev.member.name || prev.member.email,
              summary: data.frontDisplay?.summary ?? prev.frontDisplay.summary,
            },
          }
        : prev,
    );
    setSaving(false);
    setMessage("企业资料已保存。");
  }

  async function createBrand() {
    if (!enterprise || creatingBrand) return;

    setCreatingBrand(true);
    setMessage("");

    const res = await fetch(`/api/admin/enterprises/${enterprise.id}/brand`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; brandId?: string; message?: string };

    if (!res.ok) {
      setMessage(data.error ?? "创建品牌失败");
      setCreatingBrand(false);
      return;
    }

    if (data.brandId) {
      window.location.href = `/membership/admin/brands/${data.brandId}`;
      return;
    }

    setMessage(data.message ?? "已处理完成");
    setCreatingBrand(false);
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setMessage("");

    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/enterprise-logos" });
      setForm((prev) => ({ ...prev, logoUrl: imageUrl }));
      setMessage("Logo 已上传，保存后生效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logo 上传失败");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  if (loading) return <p className="text-muted">加载企业详情中...</p>;
  if (!enterprise) return <p className="text-muted">未找到企业详情。</p>;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Enterprise Detail</p>
            <h1 className="mt-3 font-serif text-3xl text-primary">{enterprise.frontDisplay.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              这里维护企业资料池。企业本身不会自动进入品牌栏目，只有绑定为品牌后才会进入 `/brands` 展示。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/membership/admin/enterprises" className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface">
              返回企业列表
            </Link>
            <Link href={`/enterprise/${enterprise.id}`} target="_blank" className="rounded-full border border-border px-4 py-2 text-primary transition hover:bg-surface">
              查看企业主页
            </Link>
            {enterprise.brand ? (
              <Link href={`/membership/admin/brands/${enterprise.brand.id}`} className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:opacity-90">
                编辑品牌
              </Link>
            ) : (
              <button
                type="button"
                disabled={creatingBrand}
                onClick={() => void createBrand()}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingBrand ? "创建中..." : "设为品牌"}
              </button>
            )}
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="企业全称"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.companyName} onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))} /></Field>
          <Field label="企业简称"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.companyShortName} onChange={(event) => setForm((prev) => ({ ...prev, companyShortName: event.target.value }))} /></Field>
          <Field label="地区"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} /></Field>
          <Field label="城市 / 区域"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.area} onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))} /></Field>
          <Field label="联系人"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.contactPerson} onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))} /></Field>
          <Field label="联系电话"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} /></Field>
          <Field label="联系信息" className="md:col-span-2"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.contactInfo} onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))} /></Field>
          <Field label="官网"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} /></Field>
          <Field label="企业地址"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} /></Field>
          <Field label="品牌定位"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.positioning} onChange={(event) => setForm((prev) => ({ ...prev, positioning: event.target.value }))} /></Field>
          <Field label="产品体系"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.productSystem} onChange={(event) => setForm((prev) => ({ ...prev, productSystem: event.target.value }))} /></Field>
          <Field label="工艺等级"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.craftLevel} onChange={(event) => setForm((prev) => ({ ...prev, craftLevel: event.target.value }))} /></Field>
          <Field label="认证情况"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.certifications} onChange={(event) => setForm((prev) => ({ ...prev, certifications: event.target.value }))} /></Field>
          <Field label="获奖记录" className="md:col-span-2"><input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.awards} onChange={(event) => setForm((prev) => ({ ...prev, awards: event.target.value }))} /></Field>
          <Field label="企业 Logo" className="md:col-span-2">
            <input className="h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary" value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                {uploadingLogo ? "上传中..." : `上传 Logo（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
              </label>
              {form.logoUrl ? (
                <Image
                  src={resolveUploadedImageUrl(form.logoUrl)}
                  alt="Logo 预览"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-[14px] border border-border bg-white object-contain p-2"
                />
              ) : null}
            </div>
          </Field>
          <Field label="企业简介" className="md:col-span-2">
            <RichEditor value={form.intro} onChange={(value) => setForm((prev) => ({ ...prev, intro: value }))} minHeight={260} placeholder="建议用 2-4 段讲清企业定位、产品体系、服务能力和合作方式。" />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={saving || uploadingLogo} onClick={() => void saveEnterprise()} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55">
            {saving ? "保存中..." : "保存企业资料"}
          </button>
          <button type="button" className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm text-primary transition hover:bg-white" onClick={() => setForm(buildForm(enterprise))}>
            恢复当前数据
          </button>
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
