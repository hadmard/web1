"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import {
  getEnterpriseVerificationFormatError,
  normalizeEnterpriseAddress,
  normalizeEnterprisePhone,
  normalizeUnifiedSocialCreditCode,
} from "@/lib/enterprise-verification-validation";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type VerifyStatus = "pending" | "approved" | "rejected";

type DashboardData = {
  member: {
    type: string;
    label: string;
    phone?: string | null;
  };
  latestVerification: {
    status: VerifyStatus;
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

type VerificationRecord = {
  id: string;
  companyName: string;
  companyShortName?: string | null;
  accountName: string;
  accountPassword?: string | null;
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
  updatedAt: string;
};

type VerificationFormState = {
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

const EMPTY_VERIFICATION_FORM: VerificationFormState = {
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

function verificationText(status: string | null | undefined) {
  if (status === "approved") return "已认证";
  if (status === "rejected") return "审核退回";
  if (status === "pending") return "审核中";
  return "未提交";
}

function formatRecordDate(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseAttachments(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function buildHomepageStatusText(data: DashboardData | null) {
  if (!data?.enterprise?.id) {
    return "完成认证后可生成企业主页，并解锁企业展示页与配套资料同步。";
  }
  if (data.siteSettingsSummary) {
    return `企业主页已建立，当前已启用 ${data.siteSettingsSummary.enabledModules} 个展示模块。`;
  }
  return "企业主页已生成，建议继续完善首页主视觉、标签和联系信息。";
}

function mapRecordToForm(record: VerificationRecord | null) {
  if (!record) return EMPTY_VERIFICATION_FORM;
  return {
    companyName: record.companyName ?? "",
    companyShortName: record.companyShortName ?? "",
    accountName: record.accountName ?? "",
    accountPassword: "",
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
  };
}

export default function MembershipVerificationPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [form, setForm] = useState<VerificationFormState>(EMPTY_VERIFICATION_FORM);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadPageData() {
    const [dashboardRes, verificationRes] = await Promise.all([
      fetch("/api/member/dashboard", {
        credentials: "include",
        cache: "no-store",
      }),
      fetch("/api/member/enterprise-verification", {
        credentials: "include",
        cache: "no-store",
      }),
    ]);

    const dashboardBody = await dashboardRes.json().catch(() => ({}));
    const verificationBody = await verificationRes.json().catch(() => ({}));

    if (!dashboardRes.ok || !verificationRes.ok) {
      if (dashboardRes.status === 401 || verificationRes.status === 401) {
        setAuthed(false);
        setMessage("请先登录后进入企业认证。");
        return;
      }
      setMessage(dashboardBody.error ?? verificationBody.error ?? "加载认证资料失败");
      return;
    }

    const nextDashboard = dashboardBody as DashboardData;
    const nextRecord = (verificationBody.latest ?? null) as VerificationRecord | null;
    setAuthed(true);
    setData(nextDashboard);
    setRecord(nextRecord);
    setForm(mapRecordToForm(nextRecord));
    setMessage("");
  }

  useEffect(() => {
    (async () => {
      try {
        await loadPageData();
      } catch {
        setMessage("网络异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verificationStatus = useMemo(
    () => verificationText(record?.status ?? data?.latestVerification?.status),
    [data?.latestVerification?.status, record?.status]
  );
  const companyName = data?.enterprise?.companyName || record?.companyName || "尚未提交";
  const enterpriseHomeStatus = buildHomepageStatusText(data);
  const attachmentPreview = useMemo(() => form.attachments.slice(0, 8), [form.attachments]);
  const showEnterpriseLink = Boolean(data?.enterprise?.id);
  const submitLabel = useMemo(() => {
    if (record?.status === "approved") return "提交修改并重新审核";
    if (record?.status === "rejected") return "重新提交审核";
    if (record?.status === "pending") return "更新资料并继续审核";
    return "提交审核";
  }, [record?.status]);

  async function handleAssetUpload(event: ChangeEvent<HTMLInputElement>, key: "logoUrl" | "licenseImageUrl") {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormMessage("");
    try {
      const imageUrl = await uploadImageToServer(file, {
        folder: key === "logoUrl" ? "verification/logos" : "verification/licenses",
      });
      setForm((prev) => ({ ...prev, [key]: imageUrl }));
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "图片上传失败，请稍后重试");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleAttachmentsUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setFormMessage("");
    try {
      const urls = await Promise.all(files.map((file) => uploadImageToServer(file, { folder: "verification/attachments" })));
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...urls].slice(0, 20),
      }));
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "附件上传失败，请稍后重试");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeAttachment(index: number) {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedForm = {
      ...form,
      contactPhone: normalizeEnterprisePhone(form.contactPhone),
      licenseCode: normalizeUnifiedSocialCreditCode(form.licenseCode),
      address: normalizeEnterpriseAddress(form.address),
    };
    const formatError = getEnterpriseVerificationFormatError(normalizedForm);
    if (formatError) {
      setForm(normalizedForm);
      setFormMessage(formatError);
      return;
    }

    setSaving(true);
    setFormMessage("");
    setForm(normalizedForm);

    try {
      const response = await fetch("/api/member/enterprise-verification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalizedForm, attachments: normalizedForm.attachments }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormMessage(body.error ?? "提交认证资料失败");
        return;
      }

      setFormMessage(record ? "认证资料已更新，已重新进入审核流程。" : "认证资料已提交，等待审核。");
      await loadPageData();
    } catch {
      setFormMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">{message || "请先登录后进入企业认证。"}</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">{message || "加载认证资料失败"}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:space-y-6 sm:px-4 sm:py-12">
      <section className="overflow-hidden rounded-[26px] border border-border bg-surface-elevated shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Enterprise Verification</p>
              <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary sm:mt-3 sm:text-3xl">企业认证与企业主页</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                这里集中处理企业主体审核、营业执照资料和企业主页状态。工作台首页只保留状态摘要，完整资料统一在这里维护。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/membership/content" className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                返回工作台
              </Link>
              {showEnterpriseLink ? (
                <Link
                  href={`/enterprise/${data.enterprise?.id}`}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface"
                >
                  查看企业主页
                </Link>
              ) : null}
              <Link href="/membership/content#site-settings" className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                企业主页配置
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatusCard label="当前认证状态" value={verificationStatus} text={`最近更新：${formatRecordDate(record?.updatedAt ?? data.latestVerification?.updatedAt)}`} />
        <StatusCard label="企业名称" value={companyName} text={data.enterprise?.companyShortName ? `简称：${data.enterprise.companyShortName}` : "尚未生成企业简称"} />
        <StatusCard label="企业主页状态" value={showEnterpriseLink ? "已生成" : "待生成"} text={enterpriseHomeStatus} />
      </section>

      <section className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <article className="rounded-[20px] border border-border bg-white/92 p-4 sm:rounded-[24px] sm:p-5">
            <h2 className="text-lg font-semibold text-primary">当前认证状态</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {record?.status === "approved"
                ? "企业主体资料已审核通过。若修改企业名称、营业执照、统一社会信用代码等关键字段，建议重新提交审核。"
                : record?.status === "pending"
                  ? "你的认证资料正在审核中。你可以在本页核对已提交的企业信息。"
                  : record?.status === "rejected"
                    ? "认证资料已被退回，请根据审核说明补充或修正后重新提交。"
                    : "你还没有提交企业认证。完成认证后可生成企业主页，并解锁企业展示能力。"}
            </p>
            {record?.reviewNote ? (
              <div className="mt-4 rounded-[18px] border border-[rgba(190,122,101,0.22)] bg-[rgba(255,244,240,0.92)] px-4 py-4 text-sm leading-6 text-[#8b5c49]">
                <p className="font-medium text-primary">审核说明</p>
                <p className="mt-2">{record.reviewNote}</p>
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-border bg-surface px-4 py-4 text-sm leading-6 text-muted">
                审核说明：{record?.status === "pending" ? "正在等待管理员审核。" : record?.status === "approved" ? "当前资料已通过审核。" : "提交后管理员会在后台核验企业主体资料。"}
              </div>
            )}
          </article>

          <article className="rounded-[20px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] p-4 sm:rounded-[24px] sm:p-5">
            <p className="text-sm font-medium text-primary">企业主页状态</p>
            <p className="mt-2 text-sm leading-6 text-muted">{enterpriseHomeStatus}</p>
            <div className="mt-4 space-y-2 text-sm text-muted">
              <p>企业主页主体资料：{showEnterpriseLink ? "已生成" : "待认证生成"}</p>
              <p>企业主页展示内容：在“企业主页配置”中维护，不与主体认证资料混用。</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {showEnterpriseLink ? (
                <Link href={`/enterprise/${data.enterprise?.id}`} className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                  查看企业主页
                </Link>
              ) : null}
              <Link href="/membership/content#site-settings" className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                去配置企业主页
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">企业认证资料</h2>
            <p className="mt-1 text-sm text-muted">用于审核企业主体资质，并与企业主页主体信息同步。</p>
          </div>
          <div className="rounded-full border border-[rgba(180,154,107,0.22)] bg-[rgba(255,249,238,0.92)] px-4 py-2 text-xs text-accent">
            关键主体字段变更建议重新审核
          </div>
        </div>

        {formMessage ? <p className="mt-4 text-sm text-emerald-700">{formMessage}</p> : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <section className="rounded-[20px] border border-border bg-white/92 p-4 sm:rounded-[24px] sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-medium text-primary">企业基础信息</h3>
              <p className="mt-1 text-sm text-muted">请填写企业主体、联系人和基础工商资料。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="企业全称" value={form.companyName} onChange={(value) => setForm((prev) => ({ ...prev, companyName: value }))} />
              <Field label="企业简称" value={form.companyShortName} onChange={(value) => setForm((prev) => ({ ...prev, companyShortName: value }))} />
              <Field label="企业账号" value={form.accountName} onChange={(value) => setForm((prev) => ({ ...prev, accountName: value }))} />
              <Field
                label="企业账号密码"
                type="password"
                value={form.accountPassword}
                helper="系统不再保存企业账号密码明文；如需补充，请仅在本次提交时填写，保存后不会回显。"
                onChange={(value) => setForm((prev) => ({ ...prev, accountPassword: value }))}
              />
              <Field label="联系人" value={form.contactPerson} onChange={(value) => setForm((prev) => ({ ...prev, contactPerson: value }))} />
              <Field label="电话" value={form.contactPhone} helper="支持手机号，或带区号的固定电话。" onChange={(value) => setForm((prev) => ({ ...prev, contactPhone: value }))} />
              <Field label="联系邮箱" value={form.contactEmail} onChange={(value) => setForm((prev) => ({ ...prev, contactEmail: value }))} />
              <Field label="统一社会信用代码" value={form.licenseCode} helper="请输入 18 位统一社会信用代码。" onChange={(value) => setForm((prev) => ({ ...prev, licenseCode: value }))} />
              <Field label="公司官网" value={form.website} onChange={(value) => setForm((prev) => ({ ...prev, website: value }))} />
              <Field label="成立时间" value={form.foundedAt} onChange={(value) => setForm((prev) => ({ ...prev, foundedAt: value }))} />
              <Field label="注册资本" value={form.registeredCapital} onChange={(value) => setForm((prev) => ({ ...prev, registeredCapital: value }))} />
              <Field label="企业地址" value={form.address} helper="请填写完整的省、市、区及详细地址。" onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
            </div>
          </section>

          <section className="rounded-[20px] border border-border bg-white/92 p-4 sm:rounded-[24px] sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-medium text-primary">企业补充说明</h3>
              <p className="mt-1 text-sm text-muted">这些内容帮助审核人员更快了解企业背景，也便于后续企业主页资料梳理。</p>
            </div>
            <div className="space-y-4">
              <TextAreaField label="企业介绍" value={form.intro} onChange={(value) => setForm((prev) => ({ ...prev, intro: value }))} />
              <TextAreaField label="经营范围" value={form.businessScope} onChange={(value) => setForm((prev) => ({ ...prev, businessScope: value }))} />
              <TextAreaField label="产品体系" value={form.productSystem} onChange={(value) => setForm((prev) => ({ ...prev, productSystem: value }))} />
              <TextAreaField label="核心优势" value={form.coreAdvantages} onChange={(value) => setForm((prev) => ({ ...prev, coreAdvantages: value }))} />
            </div>
          </section>

          <section className="rounded-[20px] border border-border bg-white/92 p-4 sm:rounded-[24px] sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-medium text-primary">营业执照或认证资料上传</h3>
              <p className="mt-1 text-sm text-muted">主体审核至少需要营业执照图片。企业 Logo 和补充附件可帮助管理员更快核验。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[18px] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-primary">企业 Logo</p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssetUpload(event, "logoUrl")} />
                  {uploading ? "上传中..." : `上传图片（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                </label>
                {form.logoUrl ? (
                  <Image src={resolveUploadedImageUrl(form.logoUrl)} alt="企业 Logo" width={72} height={72} className="mt-4 h-[72px] w-[72px] rounded-2xl border border-border object-cover" />
                ) : null}
              </div>
              <div className="rounded-[18px] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-primary">营业执照</p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssetUpload(event, "licenseImageUrl")} />
                  {uploading ? "上传中..." : `上传图片（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
                </label>
                {form.licenseImageUrl ? (
                  <Image src={resolveUploadedImageUrl(form.licenseImageUrl)} alt="营业执照" width={240} height={120} className="mt-4 h-24 w-auto rounded-2xl border border-border bg-white object-contain" />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-border bg-white/92 p-4 sm:rounded-[24px] sm:p-5">
            <div className="mb-4">
              <h3 className="text-base font-medium text-primary">补充附件</h3>
              <p className="mt-1 text-sm text-muted">可上传工厂、展厅、证书等辅助材料，帮助管理员更快做出审核判断。</p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleAttachmentsUpload(event)} />
              {uploading ? "上传中..." : "上传补充附件"}
            </label>
            {attachmentPreview.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {attachmentPreview.map((img, index) => (
                  <button
                    key={`${img.slice(0, 20)}-${index}`}
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="overflow-hidden rounded-2xl border border-border"
                    title="点击删除该附件"
                  >
                    <Image src={resolveUploadedImageUrl(img)} alt={`附件 ${index + 1}`} width={160} height={96} className="h-24 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-3 rounded-[20px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] px-4 py-4 text-sm leading-6 text-muted sm:flex-row sm:items-center sm:justify-between sm:rounded-[24px] sm:px-5">
            <p>
              提交后管理员会核验企业主体信息。若修改企业名称、营业执照、统一社会信用代码等关键字段，系统会按重新审核处理。
            </p>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[0_16px_36px_rgba(180,154,107,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "提交中..." : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatusCard({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <article className="rounded-[20px] border border-border bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:rounded-[24px] sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  helper,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      {helper ? <p className="mt-1 text-xs leading-5 text-muted">{helper}</p> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
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
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-24 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
      />
    </label>
  );
}
