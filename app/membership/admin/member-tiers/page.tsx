"use client";

import { useEffect, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

type Rule = {
  memberType: "enterprise_basic" | "personal" | "enterprise_advanced";
  label: string;
  siteLabel: string;
  publishCategoryHrefs: string[];
  newsPublishLimit: number | null;
  galleryUploadLimit: number | null;
  canSubmitStandardFeedback: boolean;
  canRecommendContent: boolean;
  defaultRankingWeight: number;
  monthlyRecommendationLimit: number;
  supportsEnterpriseProfile: boolean;
  supportsEnterpriseSite: boolean;
  supportsDictionaryContribution: boolean;
  supportsStandardCoBuild: boolean;
  supportsSubAccounts: boolean;
  supportsSeoSettings: boolean;
};

type RulesMap = Record<"enterprise_basic" | "personal" | "enterprise_advanced", Rule>;

export default function AdminMemberTiersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rules, setRules] = useState<RulesMap | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "加载失败");
        setLoading(false);
        return;
      }
      setRules(data.membershipRules ?? null);
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!rules) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipRules: rules }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "保存失败");
      setSaving(false);
      return;
    }
    setMessage("会员等级权益已保存");
    setSaving(false);
  }

  if (loading) return <div className="text-sm text-muted">加载中...</div>;
  if (!rules) return <div className="text-sm text-muted">{message || "未读取到会员等级配置"}</div>;

  const order: Array<keyof RulesMap> = ["enterprise_basic", "personal", "enterprise_advanced"];

  return (
    <div className="max-w-6xl space-y-6">
      <InlinePageBackLink href="/membership/admin" label="返回后台首页" />
      <header className="rounded-2xl border border-border bg-surface-elevated p-6">
        <h1 className="font-serif text-2xl font-bold text-primary">会员等级权益</h1>
        <p className="mt-2 text-sm text-muted">
          这里定义企业基础会员、个人会员、企业VIP会员的默认能力和年度额度。单个会员如有个体授权，将以个体授权为准。
        </p>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        {order.map((key) => {
          const rule = rules[key];
          return (
            <article key={key} className="rounded-2xl border border-border bg-surface-elevated p-5 space-y-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-primary">{rule.label}</h2>
                <p className="mt-1 text-xs text-muted">默认模板权限，可被单个会员授权覆盖</p>
              </div>

              <label className="block text-sm">
                <span className="text-primary">展示名称</span>
                <input
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  value={rule.label}
                  onChange={(e) =>
                    setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], label: e.target.value, siteLabel: e.target.value } } : prev))
                  }
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <NumberField
                  label="资讯年度额度"
                  value={rule.newsPublishLimit}
                  allowUnlimited
                  onChange={(value) => setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], newsPublishLimit: value } } : prev))}
                />
                <NumberField
                  label="图库年度额度"
                  value={rule.galleryUploadLimit}
                  allowUnlimited
                  onChange={(value) => setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], galleryUploadLimit: value } } : prev))}
                />
                <NumberField
                  label="推荐年度额度"
                  value={rule.monthlyRecommendationLimit}
                  onChange={(value) => setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], monthlyRecommendationLimit: value ?? 0 } } : prev))}
                />
                <NumberField
                  label="默认展示权重"
                  value={rule.defaultRankingWeight}
                  onChange={(value) => setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], defaultRankingWeight: value ?? 0 } } : prev))}
                />
              </div>

              <div className="space-y-2">
                <FeatureToggle label="企业资料管理" checked={rule.supportsEnterpriseProfile} onChange={(checked) => updateRuleFlag(setRules, key, "supportsEnterpriseProfile", checked)} />
                <FeatureToggle label="企业会员站" checked={rule.supportsEnterpriseSite} onChange={(checked) => updateRuleFlag(setRules, key, "supportsEnterpriseSite", checked)} />
                <FeatureToggle label="词库共建" checked={rule.supportsDictionaryContribution} onChange={(checked) => updateRuleFlag(setRules, key, "supportsDictionaryContribution", checked)} />
                <FeatureToggle label="标准共建" checked={rule.supportsStandardCoBuild} onChange={(checked) => updateRuleFlag(setRules, key, "supportsStandardCoBuild", checked)} />
                <FeatureToggle label="SEO 设置" checked={rule.supportsSeoSettings} onChange={(checked) => updateRuleFlag(setRules, key, "supportsSeoSettings", checked)} />
                <FeatureToggle label="子账号" checked={rule.supportsSubAccounts} onChange={(checked) => updateRuleFlag(setRules, key, "supportsSubAccounts", checked)} />
                <FeatureToggle label="推荐内容" checked={rule.canRecommendContent} onChange={(checked) => updateRuleFlag(setRules, key, "canRecommendContent", checked)} />
                <FeatureToggle label="标准反馈" checked={rule.canSubmitStandardFeedback} onChange={(checked) => updateRuleFlag(setRules, key, "canSubmitStandardFeedback", checked)} />
              </div>
            </article>
          );
        })}
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {saving ? "保存中..." : "保存会员等级权益"}
        </button>
      </div>
    </div>
  );
}

function updateRuleFlag(
  setRules: React.Dispatch<React.SetStateAction<RulesMap | null>>,
  key: keyof RulesMap,
  field: keyof Rule,
  checked: boolean
) {
  setRules((prev) => (prev ? { ...prev, [key]: { ...prev[key], [field]: checked } } : prev));
}

function NumberField({
  label,
  value,
  onChange,
  allowUnlimited,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  allowUnlimited?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-primary">{label}</span>
      <input
        type="number"
        min={0}
        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        value={value ?? ""}
        placeholder={allowUnlimited ? "留空表示不限" : "请输入数量"}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}

function FeatureToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm">
      <span className="text-primary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
