"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type FaqRow = { id: string; categoryId: string; question: string; answer: string; sortOrder: number };
type CategoryRow = {
  id: string;
  href: string;
  title: string;
  desc: string | null;
  definitionText: string | null;
  versionLabel: string | null;
  versionYear: number | null;
  relatedTermSlugs: string | null;
  subcategories: { id: string; href: string; label: string; groupLabel: string | null }[];
  faqs: FaqRow[];
};
type MemberRow = { id: string; email: string; name: string | null; role: string | null };

function parseRelatedSlugs(s: string | null): string {
  if (!s) return "";
  try {
    const arr = JSON.parse(s) as string[];
    return Array.isArray(arr) ? arr.join(", ") : String(s);
  } catch {
    return String(s);
  }
}

function FaqAddForm({
  categoryId,
  onAdd,
}: {
  categoryId: string;
  onAdd: (categoryId: string, question: string, answer: string) => void;
}) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  return (
    <form
      className="mt-2 flex flex-wrap gap-2 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim() && a.trim()) {
          onAdd(categoryId, q.trim(), a.trim());
          setQ("");
          setA("");
        }
      }}
    >
      <input
        className="px-2 py-1 border border-border rounded bg-surface text-primary flex-1 min-w-[160px]"
        placeholder="问题"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <input
        className="px-2 py-1 border border-border rounded bg-surface text-primary flex-1 min-w-[160px]"
        placeholder="答案"
        value={a}
        onChange={(e) => setA(e.target.value)}
      />
      <button
        type="submit"
        className="px-3 py-1 rounded bg-accent/90 text-white text-sm hover:opacity-90"
      >
        添加 FAQ
      </button>
    </form>
  );
}

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setLoading(false);
        return;
      }
      const me = await meRes.json();
      setRole(me.role ?? null);
      if (me.role !== "SUPER_ADMIN") {
        setLoading(false);
        return;
      }
      const [catRes, memRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/members"),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (memRes.ok) setMembers(await memRes.json());
      setLoading(false);
    })();
  }, []);

  async function saveCategory(
    id: string,
    data: {
      title?: string;
      desc?: string;
      definitionText?: string | null;
      versionLabel?: string | null;
      versionYear?: number | null;
      relatedTermSlugs?: string[] | string | null;
    }
  ) {
    const payload: Record<string, unknown> = { ...data };
    if (Array.isArray(data.relatedTermSlugs)) payload.relatedTermSlugs = data.relatedTermSlugs;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "保存失败");
      return;
    }
    const updated = await res.json();
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: updated.title ?? c.title,
              desc: updated.desc ?? c.desc,
              definitionText: updated.definitionText ?? c.definitionText,
              versionLabel: updated.versionLabel ?? c.versionLabel,
              versionYear: updated.versionYear ?? c.versionYear,
              relatedTermSlugs: updated.relatedTermSlugs ?? c.relatedTermSlugs,
            }
          : c
      )
    );
    setMessage("已保存");
  }

  async function saveSubcategory(
    id: string,
    data: { label?: string; groupLabel?: string | null }
  ) {
    const res = await fetch(`/api/admin/subcategories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "保存失败");
      return;
    }
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
      }))
    );
    setMessage("已保存");
  }

  async function addFaq(categoryId: string, question: string, answer: string) {
    const res = await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, question, answer }),
    });
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "添加失败");
      return;
    }
    const faq = await res.json();
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, faqs: [...(c.faqs || []), faq] } : c
      )
    );
    setMessage("FAQ 已添加");
  }

  async function updateFaq(
    id: string,
    data: { question?: string; answer?: string }
  ) {
    const res = await fetch(`/api/admin/faqs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "更新失败");
      return;
    }
    const faq = await res.json();
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        faqs: (c.faqs || []).map((f) => (f.id === id ? { ...f, ...faq } : f)),
      }))
    );
    setMessage("已保存");
  }

  async function deleteFaq(id: string, categoryId: string) {
    if (!confirm("确定删除该条 FAQ？")) return;
    const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "删除失败");
      return;
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, faqs: (c.faqs || []).filter((f) => f.id !== id) }
          : c
      )
    );
    setMessage("已删除");
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newAdminEmail,
        password: newAdminPassword,
        name: newAdminName || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "添加失败");
      return;
    }
    setMembers((prev) => [data, ...prev]);
    setNewAdminEmail("");
    setNewAdminPassword("");
    setNewAdminName("");
    setMessage("分管理员已添加");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-muted">
        加载中…
      </div>
    );
  }
  if (role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-muted">需要主账号权限。</p>
        <Link href="/membership/login" className="text-accent hover:underline mt-2 inline-block">
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/membership" className="text-sm text-muted hover:text-accent">会员</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">主账号后台</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-6">
        主账号后台
      </h1>
      <p className="text-sm text-muted mb-8">
        可修改大类、小类显示名称，并分配分管理员账号。分管理员用于日常内容管理维护。
      </p>

      {message && (
        <p className="mb-4 text-sm text-accent">{message}</p>
      )}

      <section className="mb-12">
        <h2 className="font-serif text-lg font-semibold text-primary mb-4">
          栏目配置（定义、版本、小类、FAQ）
        </h2>
        <div className="space-y-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="border border-border-warm dark:border-border-cool rounded-xl p-4 bg-surface-elevated/80"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-muted font-mono">{cat.href}</span>
                <input
                  className="flex-1 min-w-[120px] px-2 py-1 border border-border rounded text-primary bg-surface"
                  defaultValue={cat.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== cat.title) saveCategory(cat.id, { title: v });
                  }}
                />
                <input
                  className="flex-1 min-w-[180px] px-2 py-1 border border-border rounded text-muted text-sm bg-surface"
                  placeholder="描述"
                  defaultValue={cat.desc ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (cat.desc ?? "")) saveCategory(cat.id, { desc: v || undefined });
                  }}
                />
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <label className="flex flex-col gap-0.5">
                  <span className="text-muted">定义说明</span>
                  <textarea
                    className="min-h-[60px] px-2 py-1 border border-border rounded text-primary bg-surface"
                    placeholder="栏目定义说明（首屏）"
                    defaultValue={cat.definitionText ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (cat.definitionText ?? "")) saveCategory(cat.id, { definitionText: v || null });
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-muted">版本标签</span>
                    <input
                      className="w-24 px-2 py-1 border border-border rounded bg-surface text-primary"
                      placeholder="如 2026版"
                      defaultValue={cat.versionLabel ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (cat.versionLabel ?? "")) saveCategory(cat.id, { versionLabel: v || null });
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-muted">版本年</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border border-border rounded bg-surface text-primary"
                      placeholder="2026"
                      defaultValue={cat.versionYear ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const n = v ? parseInt(v, 10) : null;
                        if (Number.isNaN(n as number)) return;
                        if (n !== (cat.versionYear ?? null)) saveCategory(cat.id, { versionYear: n });
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 flex-1 min-w-[200px]">
                    <span className="text-muted">相关词条 slug（逗号分隔）</span>
                    <input
                      className="px-2 py-1 border border-border rounded bg-surface text-primary"
                      placeholder="zhengmu, xxx"
                      defaultValue={parseRelatedSlugs(cat.relatedTermSlugs)}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const arr = v ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
                        const prev = parseRelatedSlugs(cat.relatedTermSlugs);
                        const prevArr = prev ? prev.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
                        if (JSON.stringify(arr) !== JSON.stringify(prevArr)) saveCategory(cat.id, { relatedTermSlugs: arr });
                      }}
                    />
                  </label>
                </div>
              </div>
              <ul className="ml-4 mt-3 space-y-1">
                {cat.subcategories.map((sub) => (
                  <li key={sub.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted font-mono w-36 truncate">{sub.href}</span>
                    <input
                      className="px-2 py-0.5 border border-border rounded text-primary bg-surface w-28"
                      defaultValue={sub.label}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== sub.label) saveSubcategory(sub.id, { label: v });
                      }}
                    />
                    <input
                      className="px-2 py-0.5 border border-border rounded text-muted bg-surface w-24"
                      placeholder="分组"
                      defaultValue={sub.groupLabel ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (sub.groupLabel ?? "")) saveSubcategory(sub.id, { groupLabel: v || null });
                      }}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-border">
                <span className="text-muted text-sm font-medium">常见问题（FAQ）</span>
                <ul className="mt-2 space-y-2">
                  {(cat.faqs || []).map((f) => (
                    <li key={f.id} className="flex flex-col gap-1 text-sm border-l-2 border-border pl-2">
                      <input
                        className="px-2 py-0.5 border border-border rounded bg-surface text-primary w-full"
                        defaultValue={f.question}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== f.question) updateFaq(f.id, { question: v });
                        }}
                      />
                      <textarea
                        className="min-h-[44px] px-2 py-0.5 border border-border rounded bg-surface text-primary w-full text-sm"
                        defaultValue={f.answer}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== f.answer) updateFaq(f.id, { answer: v });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteFaq(f.id, cat.id)}
                        className="self-start text-xs text-muted hover:text-red-600"
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
                <FaqAddForm categoryId={cat.id} onAdd={addFaq} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-primary mb-4">
          分管理员账号
        </h2>
        <ul className="mb-6 space-y-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="text-primary">{m.email}</span>
              {m.name && <span className="text-muted">（{m.name}）</span>}
              <span className="text-muted text-xs">
                {m.role === "SUPER_ADMIN" ? "主账号" : "分管理员"}
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={addAdmin} className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">邮箱</span>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              required
              className="px-3 py-2 border border-border rounded bg-surface text-primary w-48"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">密码</span>
            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              required
              className="px-3 py-2 border border-border rounded bg-surface text-primary w-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">姓名（选填）</span>
            <input
              type="text"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              className="px-3 py-2 border border-border rounded bg-surface text-primary w-28"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:opacity-90"
          >
            添加分管理员
          </button>
        </form>
      </section>
    </div>
  );
}
