"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import {
  getEnterpriseVerificationFormatError,
  normalizeEnterpriseAddress,
  normalizeEnterprisePhone,
  normalizeUnifiedSocialCreditCode,
} from "@/lib/enterprise-verification-validation";

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
    const normalizedForm = {
      ...form,
      contactPhone: normalizeEnterprisePhone(form.contactPhone),
      licenseCode: normalizeUnifiedSocialCreditCode(form.licenseCode),
      address: normalizeEnterpriseAddress(form.address),
    };
    const formatError = getEnterpriseVerificationFormatError(normalizedForm);
    if (formatError) {
      setForm(normalizedForm);
      setMessage(formatError);
      return;
    }
    setSaving(true);
    setMessage("");

    setForm(normalizedForm);
    const payload = { ...normalizedForm, attachments: normalizedForm.attachments };
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

    setMessage(latest ? "认证资料修改已提交，等待主管理员重新审核。" : "认证资料已提交，等待主管理员审核。");
    await load();
    setSaving(false);
  }

  if (loading) return <div className="mx-auto max-w-5xl px-3 py-6 text-muted sm:px-4 sm:py-12">加载中...</div>;

  if (authed === false) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-12">
        <p className="mb-3 text-sm text-muted">请先登录后再提交企业认证。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-6 sm:space-y-6 sm:px-4 sm:py-12">
      <nav className="overflow-x-auto whitespace-nowrap text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">企业认证</span>
      </nav>

      <InlinePageBackLink href="/membership" label="返回会员系统" />
      <header className="rounded-[28px] border border-[#e9dbc5] bg-[linear-gradient(145deg,rgba(251,247,240,0.98),rgba(244,235,220,0.9))] px-5 py-6 text-[#3d3126] shadow-[0_24px_70px_rgba(111,78,38,0.08)] sm:px-7 sm:py-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#9d7c54]">Enterprise Verification</p>
        <h1 className="mt-3 font-serif text-[2rem] font-bold leading-tight text-[#2f241a] sm:text-[2.4rem]">
          企业认证申请
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6c5a46] sm:text-[15px]">
          提交资料后由主管理员审核，通过后自动生成企业详情展示页。认证通过后如需修改资料，也可直接在下方修改并重新提交审核。
        </p>
        {latest && (
          <p className="text-sm text-[#3b2f24]">
            最近状态：<span className="font-medium">{statusText(latest.status)}</span>
            {latest.reviewNote ? `（审核意见：${latest.reviewNote}）` : ""}
          </p>
        )}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
          {latest && (
            <a href="#verification-form" className="inline-flex w-full items-center justify-center rounded-full border border-[#dbc29e] bg-white/72 px-5 py-2.5 text-sm text-[#7f6542] transition hover:bg-white sm:w-auto">
              {latest.status === "approved" ? "修改已通过的认证资料" : "继续修改认证资料"}
            </a>
          )}
          {(latest?.approvedEnterpriseId || enterpriseId) && (
            <Link
              href={`/enterprise/${latest?.approvedEnterpriseId ?? enterpriseId}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#a27d4f] px-5 py-2.5 text-sm text-white transition hover:bg-[#8e6b42] sm:w-auto"
            >
              查看自动生成的企业详情页
            </Link>
          )}
        </div>
        {message && (
          <p
            ref={messageRef}
            className="scroll-mt-24 rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-3 text-sm text-[#8d6e4a]"
          >
            {message}
          </p>
        )}
      </header>

      <form
        id="verification-form"
        onSubmit={submit}
        className="space-y-5 rounded-[28px] border border-[#ece2d2] bg-white/96 p-4 shadow-[0_22px_64px_rgba(94,72,44,0.08)] sm:p-6"
      >
        <section className="rounded-[24px] border border-[#f0e6d8] bg-[#fffdfa] p-4 sm:p-5">
          <div className="mb-4 space-y-1">
            <h2 className="font-serif text-xl text-[#2f241a]">企业基础信息</h2>
            <p className="text-sm leading-6 text-[#7a6650]">用于审核与企业页面初始化，请尽量填写完整、准确。</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="企业全称" required value={form.companyName} onChange={(v) => setForm((p) => ({ ...p, companyName: v }))} />
            <TextField label="企业简称" value={form.companyShortName} onChange={(v) => setForm((p) => ({ ...p, companyShortName: v }))} />
            <TextField label="企业账号" required value={form.accountName} onChange={(v) => setForm((p) => ({ ...p, accountName: v }))} />
            <TextField label="企业账号密码" required value={form.accountPassword} onChange={(v) => setForm((p) => ({ ...p, accountPassword: v }))} />
            <TextField label="联系人" required value={form.contactPerson} onChange={(v) => setForm((p) => ({ ...p, contactPerson: v }))} />
            <TextField
              label="联系电话"
              required
              value={form.contactPhone}
              onChange={(v) => setForm((p) => ({ ...p, contactPhone: v }))}
              placeholder="例如：13812345678 或 021-56789012"
              hint="请填写规范的手机号码，或带区号的固定电话。"
            />
            <TextField label="联系邮箱" value={form.contactEmail} onChange={(v) => setForm((p) => ({ ...p, contactEmail: v }))} />
            <TextField
              label="统一社会信用代码"
              required
              value={form.licenseCode}
              onChange={(v) => setForm((p) => ({ ...p, licenseCode: v }))}
              placeholder="请输入 18 位统一社会信用代码"
              hint="系统会按国家统一社会信用代码规则校验。"
            />
            <TextField label="公司官网" value={form.website} onChange={(v) => setForm((p) => ({ ...p, website: v }))} />
            <TextField label="成立时间" value={form.foundedAt} onChange={(v) => setForm((p) => ({ ...p, foundedAt: v }))} placeholder="例如：2018-10" />
            <TextField label="注册资本" value={form.registeredCapital} onChange={(v) => setForm((p) => ({ ...p, registeredCapital: v }))} />
            <TextField
              label="企业地址"
              required
              value={form.address}
              onChange={(v) => setForm((p) => ({ ...p, address: v }))}
              placeholder="例如：浙江省杭州市余杭区文一西路 123 号"
              hint="请填写完整的省/市/区县及详细地址。"
            />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f0e6d8] bg-[#fffdfa] p-4 sm:p-5">
          <div className="mb-4 space-y-1">
            <h2 className="font-serif text-xl text-[#2f241a]">补充说明</h2>
            <p className="text-sm leading-6 text-[#7a6650]">这些内容会帮助审核人员更完整地了解企业背景与产品能力。</p>
          </div>
          <div className="space-y-4">
            <TextAreaField label="企业介绍" value={form.intro} onChange={(v) => setForm((p) => ({ ...p, intro: v }))} />
            <TextAreaField label="经营范围" value={form.businessScope} onChange={(v) => setForm((p) => ({ ...p, businessScope: v }))} />
            <TextAreaField label="产品体系" value={form.productSystem} onChange={(v) => setForm((p) => ({ ...p, productSystem: v }))} />
            <TextAreaField label="核心优势" value={form.coreAdvantages} onChange={(v) => setForm((p) => ({ ...p, coreAdvantages: v }))} />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f0e6d8] bg-[#fffdfa] p-4 sm:p-5">
          <div className="mb-4 space-y-1">
            <h2 className="font-serif text-xl text-[#2f241a]">资质图片</h2>
            <p className="text-sm leading-6 text-[#7a6650]">支持手机直接上传，系统会自动处理大图压缩。</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-[22px] border border-[#efe5d7] bg-white p-4">
              <p className="text-sm font-medium text-[#3b2f24]">企业 Logo</p>
              <input type="file" accept="image/*" onChange={(e) => void uploadSingle(e, "logoUrl")} className="block w-full text-sm text-[#7a6650]" />
              <p className="text-[11px] text-[#8b7760]">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
              {form.logoUrl && (
                <Image
                  src={resolveUploadedImageUrl(form.logoUrl)}
                  alt="logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl border border-[#eadfce] object-cover"
                />
              )}
            </div>
            <div className="space-y-3 rounded-[22px] border border-[#efe5d7] bg-white p-4">
              <p className="text-sm font-medium text-[#3b2f24]">营业执照（必填）</p>
              <input type="file" accept="image/*" onChange={(e) => void uploadSingle(e, "licenseImageUrl")} className="block w-full text-sm text-[#7a6650]" />
              <p className="text-[11px] text-[#8b7760]">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
              {form.licenseImageUrl && (
                <Image
                  src={resolveUploadedImageUrl(form.licenseImageUrl)}
                  alt="license"
                  width={240}
                  height={96}
                  className="h-24 w-auto rounded-2xl border border-[#eadfce] bg-white object-contain"
                />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f0e6d8] bg-[#fffdfa] p-4 sm:p-5">
          <div className="mb-4 space-y-1">
            <h2 className="font-serif text-xl text-[#2f241a]">补充附件</h2>
            <p className="text-sm leading-6 text-[#7a6650]">可上传工厂、展厅、证书等辅助材料，帮助加快审核判断。</p>
          </div>
          <input type="file" accept="image/*" multiple onChange={(e) => void uploadAttachments(e)} className="block w-full text-sm text-[#7a6650]" />
          <p className="mt-2 text-[11px] text-[#8b7760]">单张最大 {MAX_UPLOAD_IMAGE_MB}MB，超限可自动压缩。</p>
          {attachPreview.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {attachPreview.map((img, idx) => (
                <button
                  key={`${img.slice(0, 20)}-${idx}`}
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="relative overflow-hidden rounded-2xl border border-[#eadfce]"
                  title="点击删除该附件"
                >
                  <Image
                    src={resolveUploadedImageUrl(img)}
                    alt={`attachment-${idx + 1}`}
                    width={160}
                    height={80}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-start">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-[#a27d4f] px-5 py-3 text-sm font-medium tracking-[0.08em] text-white transition hover:bg-[#8e6b42] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[180px]"
          >
            {saving ? "提交中..." : latest ? "提交修改审核" : "提交认证申请"}
          </button>
        </div>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#5b4a39]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#2f241a] outline-none transition focus:border-[#c9a46b]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
      {hint ? <span className="mt-2 block text-[11px] text-[#8b7760]">{hint}</span> : null}
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
      <span className="text-sm font-medium text-[#5b4a39]">{label}</span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-[22px] border border-[#eadfce] bg-white px-4 py-3 text-sm leading-7 text-[#2f241a] outline-none transition focus:border-[#c9a46b]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
