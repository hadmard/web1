"use client";

import { useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import { MEMBER_PUBLISH_CATEGORY_OPTIONS } from "@/lib/content-taxonomy";

type MemberSummary = {
  id: string;
  account: string;
  name: string | null;
  role: string | null;
  memberType: string;
  createdAt: string;
};

type GrantSettings = {
  year: number;
  features: Record<string, boolean | null>;
  categories: Record<
    string,
    {
      enabled: boolean | null;
      annualLimit: number | null;
      subcategories: Record<string, { enabled: boolean | null; annualLimit: number | null }>;
    }
  >;
};

type Rule = {
  label: string;
  newsPublishLimit: number | null;
  galleryUploadLimit: number | null;
};

const FEATURE_ITEMS: Array<[string, string]> = [
  ["enterpriseSite", "企业站"],
  ["seo", "SEO"],
  ["recommendContent", "推荐内容"],
  ["galleryUpload", "图库上传"],
  ["standardFeedback", "标准反馈"],
  ["dictionaryContribution", "词库共建"],
  ["standardCoBuild", "标准共建"],
  ["subAccounts", "子账号"],
];

export default function AdminMemberGrantsPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [grants, setGrants] = useState<GrantSettings | null>(null);
  const [defaultRule, setDefaultRule] = useState<Rule | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/members", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ([]));
      const rows = Array.isArray(data) ? data : [];
      setMembers(rows);
      if (rows[0]?.id) setSelectedId(rows[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const res = await fetch(`/api/admin/member-grants/${selectedId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "读取授权失败");
        return;
      }
      setGrants(data.grants ?? null);
      setDefaultRule(data.defaultRule ?? null);
    })();
  }, [selectedId]);

  const selectedMember = useMemo(() => members.find((item) => item.id === selectedId) ?? null, [members, selectedId]);

  async function save() {
    if (!selectedId || !grants) return;
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/member-grants/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grants),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "保存失败");
      setSaving(false);
      return;
    }
    setGrants(data.grants ?? grants);
    setMessage("会员个体授权已保存");
    setSaving(false);
  }

  if (loading) return <div className="text-sm text-muted">加载中...</div>;

  return (
    <div className="max-w-7xl space-y-6">
      <InlinePageBackLink href="/membership/admin" label="返回后台首页" />

      <header className="rounded-2xl border border-border bg-surface-elevated p-6">
        <h1 className="font-serif text-2xl font-bold text-primary">会员授权管理</h1>
        <p className="mt-2 text-sm text-muted">
          用于覆盖会员等级默认权益，可细化到栏目、子栏目和年度数量。适合媒体客户、合作机构和特殊企业账号。
        </p>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="grid gap-4 xl:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-border bg-surface-elevated p-4">
          <label className="block text-sm">
            <span className="text-primary">选择会员</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {(member.name?.trim() || member.account) + " / " + member.memberType}
                </option>
              ))}
            </select>
          </label>

          {selectedMember && defaultRule ? (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
              <p>会员类型：{selectedMember.memberType}</p>
              <p>默认权益：{defaultRule.label}</p>
              <p>默认资讯额度：{defaultRule.newsPublishLimit == null ? "不限" : `${defaultRule.newsPublishLimit} / 年`}</p>
              <p>默认图库额度：{defaultRule.galleryUploadLimit == null ? "不限" : `${defaultRule.galleryUploadLimit} / 年`}</p>
            </div>
          ) : null}
        </aside>

        <section className="space-y-4">
          {grants ? (
            <>
              <article className="rounded-2xl border border-border bg-surface-elevated p-5">
                <label className="block text-sm max-w-[220px]">
                  <span className="text-primary">授权年度</span>
                  <input
                    type="number"
                    min={2024}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                    value={grants.year}
                    onChange={(e) =>
                      setGrants((prev) =>
                        prev ? { ...prev, year: Number(e.target.value) || new Date().getFullYear() } : prev
                      )
                    }
                  />
                </label>
              </article>

              <article className="rounded-2xl border border-border bg-surface-elevated p-5">
                <h2 className="text-lg font-semibold text-primary">功能覆盖</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {FEATURE_ITEMS.map(([key, label]) => (
                    <FeatureSelect
                      key={key}
                      label={label}
                      value={grants.features[key] ?? null}
                      onChange={(value) =>
                        setGrants((prev) =>
                          prev ? { ...prev, features: { ...prev.features, [key]: value } } : prev
                        )
                      }
                    />
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-surface-elevated p-5">
                <h2 className="text-lg font-semibold text-primary">栏目与子栏目授权</h2>
                <div className="mt-4 space-y-4">
                  {MEMBER_PUBLISH_CATEGORY_OPTIONS.map((category) => {
                    const categoryGrant = grants.categories[category.href];
                    return (
                      <div key={category.href} className="rounded-2xl border border-border bg-surface p-4">
                        <div className="grid gap-3 md:grid-cols-[1.2fr,140px,160px]">
                          <div>
                            <p className="text-sm font-medium text-primary">{category.label}</p>
                            <p className="text-xs text-muted">{category.href}</p>
                          </div>
                          <FeatureSelect
                            label="栏目开关"
                            compact
                            value={categoryGrant?.enabled ?? null}
                            onChange={(value) =>
                              setGrants((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      categories: {
                                        ...prev.categories,
                                        [category.href]: { ...prev.categories[category.href], enabled: value },
                                      },
                                    }
                                  : prev
                              )
                            }
                          />
                          <NumberInput
                            label="栏目年额度"
                            value={categoryGrant?.annualLimit ?? null}
                            onChange={(value) =>
                              setGrants((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      categories: {
                                        ...prev.categories,
                                        [category.href]: { ...prev.categories[category.href], annualLimit: value },
                                      },
                                    }
                                  : prev
                              )
                            }
                          />
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {category.subs.map((sub) => {
                            const subGrant = categoryGrant?.subcategories[sub.href];
                            return (
                              <div key={sub.href} className="rounded-xl border border-border bg-surface-elevated p-3">
                                <p className="text-sm font-medium text-primary">{sub.label}</p>
                                <p className="mt-1 text-xs text-muted">{sub.href}</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <FeatureSelect
                                    label="子栏目开关"
                                    compact
                                    value={subGrant?.enabled ?? null}
                                    onChange={(value) =>
                                      setGrants((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              categories: {
                                                ...prev.categories,
                                                [category.href]: {
                                                  ...prev.categories[category.href],
                                                  subcategories: {
                                                    ...prev.categories[category.href].subcategories,
                                                    [sub.href]: {
                                                      ...prev.categories[category.href].subcategories[sub.href],
                                                      enabled: value,
                                                    },
                                                  },
                                                },
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="子栏目年额度"
                                    value={subGrant?.annualLimit ?? null}
                                    onChange={(value) =>
                                      setGrants((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              categories: {
                                                ...prev.categories,
                                                [category.href]: {
                                                  ...prev.categories[category.href],
                                                  subcategories: {
                                                    ...prev.categories[category.href].subcategories,
                                                    [sub.href]: {
                                                      ...prev.categories[category.href].subcategories[sub.href],
                                                      annualLimit: value,
                                                    },
                                                  },
                                                },
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存会员授权"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">请选择一个会员查看授权配置。</div>
          )}
        </section>
      </section>
    </div>
  );
}

function FeatureSelect({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  compact?: boolean;
}) {
  return (
    <label className={`block text-sm ${compact ? "" : "rounded-xl border border-border bg-surface px-3 py-2"}`}>
      <span className="text-primary">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 text-sm"
        value={value === null ? "inherit" : value ? "enabled" : "disabled"}
        onChange={(e) => onChange(e.target.value === "inherit" ? null : e.target.value === "enabled")}
      >
        <option value="inherit">继承默认</option>
        <option value="enabled">单独开启</option>
        <option value="disabled">单独关闭</option>
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-primary">{label}</span>
      <input
        type="number"
        min={0}
        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
        value={value ?? ""}
        placeholder="留空表示继承默认"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}
