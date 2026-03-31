"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type GalleryItem = {
  id: string;
  title: string | null;
  imageUrl: string;
  alt: string | null;
  category: string | null;
  sortOrder: number;
  status: "draft" | "pending" | "approved" | "rejected";
  reviewNote: string | null;
  tagSlugs: string | null;
  syncToMainSite: boolean;
  createdAt: string;
  updatedAt: string;
};

type GalleryResponse = {
  items: GalleryItem[];
  total: number;
  page: number;
  limit: number;
};

type SessionResponse = {
  session?: {
    canDeleteOwnContent?: boolean;
  } | null;
};

type FormState = {
  title: string;
  alt: string;
  category: string;
  tagSlugs: string;
  imageUrl: string;
  syncToMainSite: boolean;
};

const GALLERY_CATEGORY_OPTIONS = [
  { value: "style", label: "风格" },
  { value: "space", label: "空间" },
  { value: "craft", label: "工艺" },
  { value: "product", label: "品类" },
  { value: "enterprise", label: "企业案例" },
] as const;

const CATEGORY_LABEL_MAP = GALLERY_CATEGORY_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const EMPTY_FORM: FormState = {
  title: "",
  alt: "",
  category: "",
  tagSlugs: "",
  imageUrl: "",
  syncToMainSite: false,
};

const STATUS_LABEL: Record<GalleryItem["status"], string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "未通过",
};

const STATUS_CLASSNAME: Record<GalleryItem["status"], string> = {
  draft: "bg-surface text-muted",
  pending: "bg-[rgba(180,154,107,0.14)] text-accent",
  approved: "bg-[rgba(43,122,62,0.12)] text-[rgb(43,122,62)]",
  rejected: "bg-[rgba(185,28,28,0.12)] text-[rgb(185,28,28)]",
};

function getCategoryLabel(value: string | null | undefined) {
  if (!value) return "未分类";
  return CATEGORY_LABEL_MAP[value] ?? "未分类";
}

export default function MembershipContentGalleryPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadGallery() {
    try {
      const res = await fetch("/api/member/gallery?limit=100", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<GalleryResponse> & { error?: string };
      if (!res.ok) {
        if (res.status === 401) setAuthed(false);
        setMessage(data.error ?? "图库加载失败");
        return;
      }

      setAuthed(true);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGallery();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as SessionResponse;
        if (res.ok) {
          setCanDelete(data.session?.canDeleteOwnContent === true);
        }
      } catch {
        setCanDelete(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [items]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/gallery" });
      setForm((prev) => ({ ...prev, imageUrl }));
      setMessage("图片已上传，填写信息后保存即可。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit() {
    if (!form.imageUrl.trim()) {
      setMessage("请先上传图片");
      return;
    }

    setSaving(true);
    setMessage("正在保存...");
    try {
      const res = await fetch("/api/member/gallery", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          alt: form.alt,
          category: form.category || null,
          tagSlugs: form.tagSlugs,
          imageUrl: form.imageUrl,
          syncToMainSite: form.syncToMainSite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "保存失败");
        return;
      }

      setForm(EMPTY_FORM);
      setMessage("图片已加入图库");
      await loadGallery();
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("确定删除这张图片吗？删除后无法恢复。");
    if (!confirmed) return;

    setDeletingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/member/gallery/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "删除失败");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("图片已删除");
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setDeletingId("");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后管理图库。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:space-y-6 sm:px-4 sm:py-12">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">
          首页
        </Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">
          会员系统
        </Link>
        <span className="mx-2">/</span>
        <Link href="/membership/content" className="hover:text-accent">
          会员后台
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">图库管理</span>
      </nav>

      <InlinePageBackLink href="/membership/content" label="返回会员后台" />

      <section className="overflow-hidden rounded-[26px] border border-border bg-surface-elevated shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,239,230,0.92))] px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Gallery Console</p>
              <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:mt-3 sm:text-3xl">图库管理</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:mt-3 sm:leading-7">上传案例图、工艺图或空间图，保存后会进入你的企业图库。</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <MiniStat label="总数" value={String(stats.total)} />
              <MiniStat label="待审核" value={String(stats.pending)} />
              <MiniStat label="已通过" value={String(stats.approved)} />
              <MiniStat label="草稿/退回" value={String(stats.draft + stats.rejected)} />
            </div>
          </div>
          {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
        </div>
      </section>

      <section className="grid gap-5 sm:gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <article className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">上传图片</h2>
              <p className="mt-1 text-sm text-muted">先上传图片，再补标题和标签。</p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {uploading ? "上传中..." : `上传图片（最大 ${MAX_UPLOAD_IMAGE_MB}MB）`}
            </label>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm text-primary">图片地址</span>
              <input
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
            </label>
            <Field label="标题" value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
            <Field label="图片说明" value={form.alt} onChange={(value) => setForm((prev) => ({ ...prev, alt: value }))} />
            <label className="block">
              <span className="text-sm text-primary">分类</span>
              <select
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">未分类</option>
                {GALLERY_CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="标签"
              value={form.tagSlugs}
              onChange={(value) => setForm((prev) => ({ ...prev, tagSlugs: value }))}
              placeholder="例如：轻奢, 客厅, 护墙板"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-primary">
              <input
                type="checkbox"
                checked={form.syncToMainSite}
                onChange={(e) => setForm((prev) => ({ ...prev, syncToMainSite: e.target.checked }))}
              />
              同步到主站图库
            </label>
          </div>

          {form.imageUrl ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-border bg-white">
              <img
                src={resolveUploadedImageUrl(form.imageUrl)}
                alt={form.alt || form.title || "图库预览"}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || uploading}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(180,154,107,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-2.5"
            >
              {saving ? "保存中..." : "加入图库"}
            </button>
          </div>
        </article>

        <article className="rounded-[24px] border border-border bg-surface-elevated p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">已上传图片</h2>
              <p className="mt-1 text-sm text-muted">这里显示你当前账号已提交的图库内容。</p>
            </div>
            <p className="text-sm text-muted">共 {stats.total} 张</p>
          </div>

          {items.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
              还没有上传图片，先从左侧添加第一张。
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:rounded-[24px]">
                  <img
                    src={resolveUploadedImageUrl(item.imageUrl)}
                    alt={item.alt || item.title || "图库图片"}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-medium text-primary">{item.title?.trim() || "未命名图片"}</h3>
                        <p className="mt-1 text-sm text-muted">{getCategoryLabel(item.category)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSNAME[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    {item.alt ? <p className="text-sm leading-6 text-muted">{item.alt}</p> : null}
                    {item.tagSlugs ? <p className="text-xs text-muted">标签：{item.tagSlugs}</p> : null}
                    <div className="flex items-center justify-between gap-3 text-xs text-muted">
                      <span>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</span>
                      <span>{item.syncToMainSite ? "已同步主站" : "仅会员图库"}</span>
                    </div>
                    {item.reviewNote ? (
                      <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs leading-6 text-muted">
                        审核备注：{item.reviewNote}
                      </div>
                    ) : null}
                    {canDelete ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-primary transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-2"
                        >
                          {deletingId === item.id ? "删除中..." : "删除图片"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:px-4 sm:py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-primary sm:mt-3 sm:text-lg">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-primary">{label}</span>
      <input
        className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-primary"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
