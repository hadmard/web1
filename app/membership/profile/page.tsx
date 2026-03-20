"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

        const t = (data.member?.memberType ?? "personal") as MemberType;
        setMemberType(t);
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

  const baseFields = useMemo(
    () => [
      { key: "intro", label: "企业介绍", type: "textarea" as const },
      { key: "logoUrl", label: "企业 Logo", type: "text" as const },
      { key: "region", label: "所属区域", type: "text" as const },
      { key: "area", label: "省市区", type: "text" as const },
      { key: "contactInfo", label: "联系方式", type: "text" as const },
      { key: "contactPhone", label: "联系电话", type: "text" as const },
    ],
    []
  );

  const advancedFields = useMemo(
    () => [
      { key: "positioning", label: "企业定位" },
      { key: "productSystem", label: "产品体系" },
      { key: "craftLevel", label: "工艺等级" },
      { key: "certifications", label: "认证情况" },
      { key: "awards", label: "获奖记录" },
      { key: "relatedStandards", label: "关联标准 ID（逗号分隔）" },
      { key: "relatedTerms", label: "关联词条 Slug（逗号分隔）" },
      { key: "relatedBrands", label: "关联品牌 ID（逗号分隔）" },
      { key: "videoUrl", label: "企业视频链接" },
    ],
    []
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
    return <div className="max-w-3xl mx-auto px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-sm text-muted mb-3">请先登录后管理企业资料。</p>
        <Link href="/membership/login" className="apple-inline-link">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/membership" className="text-sm text-muted hover:text-accent">会员系统</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">企业资料管理</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-2">企业资料管理</h1>
      <p className="text-sm text-muted mb-6">
        当前会员类型：{memberType === "enterprise_advanced" ? "企业高级会员" : memberType === "enterprise_basic" ? "企业基础会员" : "个人会员"}
      </p>

      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      {noPermission ? (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 text-sm text-muted">
          个人会员不支持企业资料编辑。
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-surface-elevated p-6">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-primary">基础资料</h2>
            {baseFields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-sm text-primary">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    className="mt-1 w-full min-h-28 px-3 py-2 border border-border rounded bg-surface text-sm"
                    value={form[field.key as keyof FormState]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                    value={form[field.key as keyof FormState]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </section>

          {isAdvanced && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-primary">高级资料</h2>
              {advancedFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm text-primary">{field.label}</span>
                  <input
                    className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                    value={form[field.key as keyof FormState]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </section>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-accent text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存资料"}
          </button>
        </form>
      )}
    </div>
  );
}
