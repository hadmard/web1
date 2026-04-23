"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CONTENT_TAB_DEFS,
  MEMBER_PUBLISH_CATEGORY_OPTIONS,
  resolveTabKeyFromHref,
  type ContentTabKey,
} from "@/lib/content-taxonomy";
import { buildNewsPath } from "@/lib/share-config";
import { InlinePageBackLink } from "@/components/InlinePageBackLink";

export const dynamic = "force-dynamic";

type Status = "draft" | "pending" | "approved" | "rejected";
type AccessSubcategory = {
  href: string;
  label: string;
  enabled: boolean;
  annualLimit: number | null;
  usedCount: number;
  remainingCount: number | null;
};
type AccessCategory = {
  href: string;
  label: string;
  enabled: boolean;
  annualLimit: number | null;
  usedCount: number;
  remainingCount: number | null;
  subcategories: AccessSubcategory[];
};
type MemberAccess = {
  year: number;
  categories: AccessCategory[];
};
type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  categoryHref: string | null;
  subHref: string | null;
  status: Status;
  isPinned?: boolean | null;
  createdAt: string;
  updatedAt?: string;
};

const PAGE_SIZE = 20;
const STATUS_TEXT: Record<Status, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

function buildPreviewHref(
  categoryHref: string | null,
  subHref: string | null,
  itemId: string | null,
  slug: string | null,
  fallbackTitle: string | null
) {
  const segment = (slug || fallbackTitle || "").trim();
  if (!segment && !itemId) return null;
  const encoded = encodeURIComponent(segment);
  const tab = resolveTabKeyFromHref(categoryHref, subHref);
  if (tab === "brands") return `/brands/${encoded}`;
  if (tab === "buying") return `/brands/buying/${encoded}`;
  if (tab === "terms") return `/dictionary/${encoded}`;
  if (tab === "standards") return `/standards/${encoded}`;
  if (tab === "awards") return `/awards/${encoded}`;
  return itemId ? buildNewsPath(itemId) : `/news/${encoded}`;
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

function getCategoryLabel(categoryHref: string | null, subHref: string | null) {
  const category = MEMBER_PUBLISH_CATEGORY_OPTIONS.find((item) => categoryHref?.startsWith(item.href));
  if (!category) return "未分类";
  const sub = category.subs.find((item) => item.href === subHref);
  return sub ? `${category.label} / ${sub.label}` : category.label;
}

function buildEditHref(item: ArticleRow) {
  const tab = resolveTabKeyFromHref(item.categoryHref, item.subHref);
  return `/membership/content/publish?tab=${encodeURIComponent(tab)}&edit=${encodeURIComponent(item.id)}`;
}

export default function MemberContentSubmissionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [queryDraft, setQueryDraft] = useState(searchParams.get("q") ?? "");
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [memberAccess, setMemberAccess] = useState<MemberAccess | null>(null);

  const rawTab = searchParams.get("tab")?.trim() ?? "all";
  const rawStatus = searchParams.get("status")?.trim() ?? "all";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const query = searchParams.get("q")?.trim() ?? "";

  const allowedTabs = useMemo(() => {
    const categories = memberAccess?.categories ?? [];
    return categories
      .filter((category) => category.enabled)
      .map((category) => resolveTabKeyFromHref(category.href, null));
  }, [memberAccess]);

  const activeTab = useMemo(() => {
    if (rawTab === "all") return "all";
    return allowedTabs.includes(rawTab as ContentTabKey) ? (rawTab as ContentTabKey) : "all";
  }, [allowedTabs, rawTab]);

  const statusFilter = useMemo(() => {
    return ["all", "draft", "pending", "approved", "rejected"].includes(rawStatus) ? rawStatus : "all";
  }, [rawStatus]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || !value.trim()) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
  }

  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuth() {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setAuthed(false);
            setMessage(data.error ?? "加载失败");
          }
          return;
        }

        if (cancelled) return;
        setAuthed(true);
        setMemberAccess(data.memberAccess ?? null);
      } catch {
        if (!cancelled) setMessage("网络异常，请稍后重试");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authed !== true) return;

    let cancelled = false;

    async function loadList() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (query) params.set("q", query);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (activeTab !== "all") params.set("tab", activeTab);

        const res = await fetch(`/api/member/articles?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setMessage(data.error ?? "列表加载失败");
            setItems([]);
            setTotal(0);
          }
          return;
        }

        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch {
        if (!cancelled) setMessage("列表加载失败，请稍后重试");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadList();
    return () => {
      cancelled = true;
    };
  }, [activeTab, authed, page, query, statusFilter]);

  if (loading && authed === null) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted">加载中...</div>;
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-3 text-sm text-muted">请先登录后再查看已发内容。</p>
        <Link href="/membership/login" className="apple-inline-link">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Content Manager</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">已发内容</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            这里会集中展示当前会员名下的全部投稿记录，默认每页 20 条。资讯默认 5 条或特殊扩展额度，只影响可发布数量，不影响这里的历史内容展示。
          </p>
        </div>
        <InlinePageBackLink href="/membership/content/publish?tab=articles" label="返回发布栏目" />
      </div>

      {message ? <p className="text-sm text-accent">{message}</p> : null}

      <section className="rounded-[28px] border border-border bg-surface-elevated p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateSearchParams({
                q: queryDraft || null,
                page: "1",
              });
            }}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <input
              className="h-11 rounded-2xl border border-[rgba(194,182,154,0.28)] bg-white/92 px-4 text-sm text-primary placeholder:text-muted focus:border-[rgba(180,154,107,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(180,154,107,0.18)]"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="搜索标题、摘要、正文、来源、作者、标签、关键词、企业或品牌"
            />
            <button type="submit" className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white">
              搜索
            </button>
            <button
              type="button"
              onClick={() => {
                setQueryDraft("");
                updateSearchParams({ q: null, page: "1" });
              }}
              className="rounded-2xl border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface"
            >
              清除
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateSearchParams({ tab: null, page: "1" })}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                activeTab === "all"
                  ? "border border-accent/30 bg-[rgba(186,158,108,0.12)] text-accent"
                  : "border border-border bg-white/80 text-muted hover:text-primary"
              }`}
            >
              全部栏目
            </button>
            {allowedTabs.map((tabKey) => {
              const tabDef = CONTENT_TAB_DEFS.find((item) => item.key === tabKey);
              if (!tabDef) return null;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => updateSearchParams({ tab: tabKey, page: "1" })}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    activeTab === tabKey
                      ? "border border-accent/30 bg-[rgba(186,158,108,0.12)] text-accent"
                      : "border border-border bg-white/80 text-muted hover:text-primary"
                  }`}
                >
                  {tabDef.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "approved", "pending", "draft", "rejected"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => updateSearchParams({ status: item === "all" ? null : item, page: "1" })}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                statusFilter === item
                  ? "border border-accent/30 bg-[rgba(186,158,108,0.12)] text-accent"
                  : "border border-border bg-white/80 text-muted hover:text-primary"
              }`}
            >
              {item === "all" ? "全部状态" : STATUS_TEXT[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-surface-elevated shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="hidden grid-cols-[minmax(0,2.8fr)_minmax(0,1.2fr)_0.8fr_0.95fr_0.95fr_1.1fr] gap-4 border-b border-border bg-[rgba(255,255,255,0.74)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:grid">
          <span>标题</span>
          <span>栏目</span>
          <span>状态</span>
          <span>发布时间</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted">当前筛选条件下暂无内容记录。</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const previewHref = item.status === "approved"
                ? buildPreviewHref(item.categoryHref, item.subHref, item.id, item.slug, item.title)
                : null;
              const editHref = buildEditHref(item);
              return (
                <article key={item.id} className="px-5 py-4">
                  <div className="hidden grid-cols-[minmax(0,2.8fr)_minmax(0,1.2fr)_0.8fr_0.95fr_0.95fr_1.1fr] items-start gap-4 lg:grid">
                    <div className="min-w-0">
                      {previewHref ? (
                        <Link
                          href={previewHref}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-words text-sm font-medium leading-6 text-primary hover:text-accent hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <Link
                          href={editHref}
                          className="block break-words text-sm font-medium leading-6 text-primary hover:text-accent hover:underline"
                        >
                          {item.title}
                        </Link>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>ID：{item.id}</span>
                        {item.isPinned ? <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">置顶</span> : null}
                      </div>
                    </div>
                    <div className="min-w-0 break-words text-sm leading-6 text-muted">{getCategoryLabel(item.categoryHref, item.subHref)}</div>
                    <div>
                      <span className="rounded-full border border-border bg-white/85 px-3 py-1 text-xs text-muted">
                        {STATUS_TEXT[item.status]}
                      </span>
                    </div>
                    <div className="whitespace-nowrap text-sm text-muted">{formatRecordDate(item.createdAt)}</div>
                    <div className="whitespace-nowrap text-sm text-muted">{formatRecordDate(item.updatedAt ?? item.createdAt)}</div>
                    <div className="flex flex-wrap gap-2">
                      {previewHref ? (
                        <Link href={previewHref} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1.5 text-xs text-primary transition hover:bg-surface">
                          预览
                        </Link>
                      ) : (
                        <span className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted/80">
                          待审核后预览
                        </span>
                      )}
                      <Link href={editHref} className="rounded-lg border border-border px-3 py-1.5 text-xs text-primary transition hover:bg-surface">
                        {item.status === "approved" ? "修改" : "编辑"}
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    <div className="space-y-2">
                      {previewHref ? (
                        <Link href={previewHref} target="_blank" rel="noreferrer" className="block text-sm font-medium text-primary hover:text-accent hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <Link href={editHref} className="block text-sm font-medium text-primary hover:text-accent hover:underline">
                          {item.title}
                        </Link>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted">
                        <span>{getCategoryLabel(item.categoryHref, item.subHref)}</span>
                        <span>{STATUS_TEXT[item.status]}</span>
                        <span>{formatRecordDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewHref ? (
                        <Link href={previewHref} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1.5 text-xs text-primary transition hover:bg-surface">
                          预览
                        </Link>
                      ) : null}
                      <Link href={editHref} className="rounded-lg border border-border px-3 py-1.5 text-xs text-primary transition hover:bg-surface">
                        {item.status === "approved" ? "修改" : "编辑"}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border bg-surface-elevated px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-muted">
            共 {total} 条内容，第 {page} / {totalPages} 页，每页 20 条
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateSearchParams({ page: String(Math.max(1, page - 1)) })}
              disabled={page <= 1}
              className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => updateSearchParams({ page: String(Math.min(totalPages, page + 1)) })}
              disabled={page >= totalPages}
              className="rounded-full border border-border px-4 py-2 text-sm text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
