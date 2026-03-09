"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";

type VerifyStatus = "pending" | "approved" | "rejected";

type VerificationRecord = {
  id: string;
  companyName: string;
  companyShortName?: string | null;
  accountName: string;
  accountPassword: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string | null;
  logoUrl?: string | null;
  licenseImageUrl: string;
  licenseCode: string;
  address: string;
  foundedAt?: string | null;
  registeredCapital?: string | null;
  website?: string | null;
  intro?: string | null;
  businessScope?: string | null;
  productSystem?: string | null;
  coreAdvantages?: string | null;
  attachmentsJson?: string | null;
  status: VerifyStatus;
  reviewNote?: string | null;
  approvedEnterpriseId?: string | null;
  updatedAt: string;
};

type FormState = {
  companyName: string;
  companyShortName: string;
  accountName: string;
  accountPassword: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  logoUrl: string;
  licenseImageUrl: string;
  licenseCode: string;
  address: string;
  foundedAt: string;
  registeredCapital: string;
  website: string;
  intro: string;
  businessScope: string;
  productSystem: string;
  coreAdvantages: string;
  attachments: string[];
};

const EMPTY_FORM: FormState = {
  companyName: "",
  companyShortName: "",
  accountName: "",
  accountPassword: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  logoUrl: "",
  licenseImageUrl: "",
  licenseCode: "",
  address: "",
  foundedAt: "",
  registeredCapital: "",
  website: "",
  intro: "",
  businessScope: "",
  productSystem: "",
  coreAdvantages: "",
  attachments: [],
};

function statusText(status: VerifyStatus) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  return "待审核";
}

function parseAttachments(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export default function MemberVerificationPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<VerificationRecord | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const attachPreview = useMemo(() => form.attachments.slice(0, 6), [form.attachments]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/member/enterprise-verification", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) setAuthed(false);
      setMessage(data.error ?? "加载失败");
      setLoading(false);
      return;
    }

    setAuthed(true);
    const record = (data.latest ?? null) as VerificationRecord | null;
    const enterprise = data.enterprise as { id?: string } | null;
    setLatest(record);
    setEnterpriseId(enterprise?.id ?? null);

    if (record) {
      setForm({
        companyName: record.companyName ?? "",
        companyShortName: record.companyShortName ?? "",
        accountName: record.accountName ?? "",
        accountPassword: record.accountPassword ?? "",
        contactPerson: record.contactPerson ?? "",
        contactPhone: record.contactPhone ?? "",
        contactEmail: record.contactEmail ?? "",
        logoUrl: record.logoUrl ?? "",
        licenseImageUrl: record.licenseImageUrl ?? "",
        licenseCode: record.licenseCode ?? "",
        address: record.address ?? "",
        foundedAt: record.foundedAt ?? "",
        registeredCapital: record.registeredCapital ?? "",
        website: record.website ?? "",
        intro: record.intro ?? "",
        businessScope: record.businessScope ?? "",
        productSystem: record.productSystem ?? "",
        coreAdvantages: record.coreAdvantages ?? "",
        attachments: parseAttachments(record.attachmentsJson),
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!message) return;
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message]);

  async function uploadSingle(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "logoUrl" | "licenseImageUrl"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await uploadImageToServer(file, {
        folder: key === "logoUrl" ? "verification/logos" : "verification/licenses",
      });
      setForm((prev) => ({ ...prev, [key]: imageUrl }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片读取失败，请重试");
    } finally {
      e.target.value = "";
    }
  }

  async function uploadAttachments(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      const urls = await Promise.all(
        files.map((f) => uploadImageToServer(f, { folder: "verification/attachments" }))
      );
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...urls].slice(0, 20),
      }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "附件读取失败，请重试");
    } finally {
      e.target.value = "";
    }
  }

  function removeAttachment(index: number) {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = { ...form, attachments: form.attachments };
    const res = await fetch("/api/member/enterprise-verification", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? "提交失败");
      setSaving(false);
      return;
    }

    setMessage("认证资料已提交，等待主管理员审核。");
    await load();
    setSaving(false);
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12 text-muted">加载中...</div>;

  if (authed === false) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后再提交企业认证。</p>
        <Link href="/membership/login" className="text-sm text-accent hover:underline">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">企业认证</span>
      </nav>

      <header className="rounded-xl border border-border bg-surface-elevated p-5 space-y-2">
        <h1 className="font-serif text-2xl font-bold text-primary">企业认证申请</h1>
        <p className="text-sm text-muted">提交资料后由主管理员审核，通过后自动生成企业详情展示页。</p>
        {latest && (
          <p className="text-sm text-primary">
            最近状态：<span className="font-medium">{statusText(latest.status)}</span>
            {latest.reviewNote ? `（审核意见：${latest.reviewNote}）` : ""}
          </p>
        )}
        {(latest?.approvedEnterpriseId || enterpriseId) && (
          <Link
            href={`/enterprise/${latest?.approvedEnterpriseId ?? enterpriseId}`}
            className="inline-flex text-sm text-accent hover:underline"
          >
            查看自动生成的企业详情页
          </Link>
        )}
        {message && (
          <p ref={messageRef} className="text-sm text-accent scroll-mt-24">
            {message}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="rounded-xl border border-border bg-surface-elevated p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <TextField label="企业全称" required value={form.companyName} onChange={(v) => setForm((p) => ({ ...p, companyName: v }))} />
          <TextField label="企业简称" value={form.companyShortName} onChange={(v) => setForm((p) => ({ ...p, companyShortName: v }))} />
          <TextField label="企业账号" required value={form.accountName} onChange={(v) => setForm((p) => ({ ...p, accountName: v }))} />
          <TextField label="企业账号密码" required value={form.accountPassword} onChange={(v) => setForm((p) => ({ ...p, accountPassword: v }))} />
          <TextField label="联系人" required value={form.contactPerson} onChange={(v) => setForm((p) => ({ ...p, contactPerson: v }))} />
          <TextField label="联系电话" required value={form.contactPhone} onChange={(v) => setForm((p) => ({ ...p, contactPhone: v }))} />
          <TextField label="联系邮箱" value={form.contactEmail} onChange={(v) => setForm((p) => ({ ...p, contactEmail: v }))} />
          <TextField label="统一社会信用代码" required value={form.licenseCode} onChange={(v) => setForm((p) => ({ ...p, licenseCode: v }))} />
          <TextField label="公司官网" value={form.website} onChange={(v) => setForm((p) => ({ ...p, website: v }))} />
          <TextField label="成立时间" value={form.foundedAt} onChange={(v) => setForm((p) => ({ ...p, foundedAt: v }))} placeholder="例如：2018-10" />
          <TextField label="注册资本" value={form.registeredCapital} onChange={(v) => setForm((p) => ({ ...p, registeredCapital: v }))} />
          <TextField label="企业地址" required value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
        </div>

        <TextAreaField label="企业介绍" value={form.intro} onChange={(v) => setForm((p) => ({ ...p, intro: v }))} />
        <TextAreaField label="经营范围" value={form.businessScope} onChange={(v) => setForm((p) => ({ ...p, businessScope: v }))} />
        <TextAreaField label="产品体系" value={form.productSystem} onChange={(v) => setForm((p) => ({ ...p, productSystem: v }))} />
        <TextAreaField label="核心优势" value={form.coreAdvantages} onChange={(v) => setForm((p) => ({ ...p, coreAdvantages: v }))} />

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-primary">资质图片</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted">企业 Logo</p>
              <input type="file" accept="image/*" onChange={(e) => void uploadSingle(e, "logoUrl")} className="block w-full text-sm" />
              <p className="text-[11px] text-muted">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
              {form.logoUrl && (
                <Image
                  src={form.logoUrl}
                  alt="logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded border border-border object-cover"
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted">营业执照（必填）</p>
              <input type="file" accept="image/*" onChange={(e) => void uploadSingle(e, "licenseImageUrl")} className="block w-full text-sm" />
              <p className="text-[11px] text-muted">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
              {form.licenseImageUrl && (
                <Image
                  src={form.licenseImageUrl}
                  alt="license"
                  width={240}
                  height={96}
                  className="h-24 w-auto rounded border border-border object-contain bg-white"
                />
              )}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-primary">补充附件（可选）</h2>
          <input type="file" accept="image/*" multiple onChange={(e) => void uploadAttachments(e)} className="block w-full text-sm" />
          <p className="text-[11px] text-muted">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
          {attachPreview.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {attachPreview.map((img, idx) => (
                <button
                  key={`${img.slice(0, 20)}-${idx}`}
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="relative rounded border border-border overflow-hidden"
                  title="点击删除该附件"
                >
                  <Image
                    src={img}
                    alt={`attachment-${idx + 1}`}
                    width={160}
                    height={80}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-accent text-white text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "提交中..." : "提交认证申请"}
        </button>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
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
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <textarea
        className="mt-1 w-full min-h-24 px-3 py-2 border border-border rounded bg-surface text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
