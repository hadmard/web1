"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONTENT_TAB_DEFS,
  resolveTabKeyFromHref,
  type ContentTabKey,
} from "@/lib/content-taxonomy";

type SidebarLink = { href: string; label: string; tabKey?: ContentTabKey };
type SidebarGroup = {
  id: string;
  label: string;
  children: SidebarLink[];
  superOnly?: boolean;
  withAuditBadge?: boolean;
};

type PendingArticle = { categoryHref?: string | null; subHref?: string | null };
type PendingChange = {
  article?: { categoryHref?: string | null; subHref?: string | null } | null;
};

type CollapseState = Record<string, boolean>;

const COLLAPSE_STORAGE_KEY = "admin_sidebar_collapse_state_v1";
const SCROLL_STORAGE_KEY = "admin_sidebar_scroll_top_v1";

const SIDEBAR: SidebarGroup[] = [
  {
    id: "stats",
    label: "数据统计",
    children: [{ href: "/membership/admin/stats", label: "运营看板" }],
  },
  {
    id: "publish",
    label: "内容发布",
    children: CONTENT_TAB_DEFS.map((t) => ({
      href: `/membership/admin/content?mode=publish&tab=${t.key}`,
      label: t.label,
      tabKey: t.key,
    })),
  },
  {
    id: "manage",
    label: "内容管理",
    children: CONTENT_TAB_DEFS.map((t) => ({
      href: `/membership/admin/content?mode=manage&tab=${t.key}`,
      label: t.label,
      tabKey: t.key,
    })),
  },
  {
    id: "review",
    label: "审核中心",
    withAuditBadge: true,
    children: [
      ...CONTENT_TAB_DEFS.map((t) => ({
        href: `/membership/admin/content?mode=review&tab=${t.key}`,
        label: t.label,
        tabKey: t.key,
      })),
      { href: "/membership/admin/enterprise-verifications", label: "企业认证审核" },
    ],
  },
  {
    id: "enterprise",
    label: "企业管理",
    children: [{ href: "/membership/admin/enterprises", label: "企业列表" }],
  },
  {
    id: "account",
    label: "账号",
    children: [
      { href: "/membership/admin/accounts", label: "账号一览" },
      { href: "/membership/admin/password-recovery-requests", label: "密码找回申请" },
      { href: "/membership/admin/brands", label: "品牌展示管理" },
      { href: "/membership/admin/brands/create", label: "创建品牌" },
      { href: "/membership/admin/pending-brands", label: "待审核品牌" },
      { href: "/membership/admin/permissions", label: "权限管理（主管理员）" },
      { href: "/membership/admin/member-tiers", label: "会员等级权益" },
      { href: "/membership/admin/member-grants", label: "会员授权管理" },
    ],
  },
  {
    id: "system",
    label: "系统",
    superOnly: true,
    children: [{ href: "/membership/admin/settings", label: "系统设置" }],
  },
];

function defaultCollapseState(): CollapseState {
  return {
    stats: false,
    publish: false,
    manage: false,
    review: false,
    enterprise: false,
    account: false,
    system: true,
  };
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapseState, setCollapseState] = useState<CollapseState>(defaultCollapseState());
  const [auditCounts, setAuditCounts] = useState<Record<ContentTabKey, number>>({
    articles: 0,
    brands: 0,
    terms: 0,
    standards: 0,
    "industry-data": 0,
    awards: 0,
    gallery: 0,
  });
  const [pendingEnterpriseVerificationCount, setPendingEnterpriseVerificationCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CollapseState;
        setCollapseState({ ...defaultCollapseState(), ...parsed });
      }
    } catch {
      setCollapseState(defaultCollapseState());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(collapseState));
  }, [collapseState]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (raw) {
      const top = Number(raw);
      if (!Number.isNaN(top)) el.scrollTop = top;
    }

    const onScroll = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollTop));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setRole(null);
        setLoading(false);
        return;
      }
      const me = await res.json();
      setRole(me.role ?? null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      setPendingEnterpriseVerificationCount(0);
      return;
    }
    (async () => {
      const [aRes, cRes, vRes] = await Promise.all([
        fetch("/api/admin/articles?status=pending&limit=500", { credentials: "include" }),
        fetch("/api/admin/article-change-requests?status=pending&limit=500", { credentials: "include" }),
        fetch("/api/admin/enterprise-verifications?status=pending&limit=500", { credentials: "include" }),
      ]);

      const nextCounts: Record<ContentTabKey, number> = {
        articles: 0,
        brands: 0,
        terms: 0,
        standards: 0,
        "industry-data": 0,
        awards: 0,
        gallery: 0,
      };

      if (aRes.ok) {
        const data = await aRes.json();
        const items: PendingArticle[] = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
          const key = resolveTabKeyFromHref(item.categoryHref, item.subHref);
          nextCounts[key] += 1;
        }
      }

      if (cRes.ok) {
        const data = await cRes.json();
        const items: PendingChange[] = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
          const key = resolveTabKeyFromHref(item.article?.categoryHref, item.article?.subHref);
          nextCounts[key] += 1;
        }
      }

      setAuditCounts(nextCounts);
      if (vRes.ok) {
        const data = await vRes.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setPendingEnterpriseVerificationCount(items.length);
      } else {
        setPendingEnterpriseVerificationCount(0);
      }
    })();
  }, [role]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileSidebarOpen]);

  const totalAuditCount = useMemo(
    () => Object.values(auditCounts).reduce((sum, n) => sum + n, 0) + pendingEnterpriseVerificationCount,
    [auditCounts, pendingEnterpriseVerificationCount]
  );

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted">加载中...</div>;
  }

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-muted mb-4">需要管理员权限。</p>
        <Link
          href="/membership/login"
          className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }

  const isSuperAdmin = role === "SUPER_ADMIN";

  const isLinkActive = (href: string) => {
    if (href === "/membership/admin/accounts") return pathname === "/membership/admin/accounts";
    if (href === "/membership/admin/enterprises") return pathname === "/membership/admin/enterprises" || pathname.startsWith("/membership/admin/enterprises/");
    if (href === "/membership/admin/password-recovery-requests") return pathname === "/membership/admin/password-recovery-requests";
    if (href === "/membership/admin/brands/create") return pathname === "/membership/admin/brands/create";
    if (href === "/membership/admin/brands") {
      return pathname === "/membership/admin/brands" || (pathname.startsWith("/membership/admin/brands/") && pathname !== "/membership/admin/brands/create");
    }
    if (href === "/membership/admin/pending-brands") return pathname === "/membership/admin/pending-brands";
    if (href === "/membership/admin/permissions") return pathname === "/membership/admin/permissions";
    if (href === "/membership/admin/member-tiers") return pathname === "/membership/admin/member-tiers";
    if (href === "/membership/admin/member-grants") return pathname === "/membership/admin/member-grants";
    if (href === "/membership/admin/settings") return pathname === "/membership/admin/settings";
    if (href === "/membership/admin/stats") return pathname === "/membership/admin/stats";
    if (href === "/membership/admin/enterprise-verifications") return pathname === "/membership/admin/enterprise-verifications";

    if (!href.startsWith("/membership/admin/content")) return pathname === href;
    if (pathname !== "/membership/admin/content") return false;

    const mode = searchParams.get("mode") ?? "publish";
    const tab = searchParams.get("tab") ?? "articles";
    const targetMode = href.match(/mode=([^&]+)/)?.[1];
    const targetTab = href.match(/tab=([^&]+)/)?.[1];
    return mode === targetMode && tab === targetTab;
  };

  const toggleGroup = (groupId: string) => {
    setCollapseState((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const sidebarNavigation = (
    <>
      <nav className="space-y-0.5" aria-label="后台功能">
        {SIDEBAR.map((group) => {
          if (group.superOnly && !isSuperAdmin) return null;
          const collapsed = !!collapseState[group.id];
          return (
            <div key={group.id} className="mb-3 last:mb-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full min-h-11 rounded-[22px] border border-[rgba(200,188,164,0.16)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(250,246,239,0.92))] px-4 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_10px_24px_rgba(176,154,116,0.06)] transition hover:border-[rgba(194,182,154,0.28)] hover:bg-[linear-gradient(180deg,rgba(255,253,249,1),rgba(252,248,241,0.96))]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold tracking-[0.04em] text-primary">{group.label}</span>
                  <span className="inline-flex items-center gap-2">
                  {group.withAuditBadge && totalAuditCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px]">
                      {totalAuditCount}
                    </span>
                  )}
                  <span className="inline-flex items-center justify-center w-4 h-4 text-muted">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
                      fill="currentColor"
                    >
                      <path d="M5.5 7.5a1 1 0 0 1 1.4 0L10 10.6l3.1-3.1a1 1 0 0 1 1.4 1.4l-3.8 3.8a1 1 0 0 1-1.4 0L5.5 8.9a1 1 0 0 1 0-1.4Z" />
                    </svg>
                  </span>
                  </span>
                </span>
              </button>

              {!collapsed && (
                <ul className="mt-2.5 ml-5 space-y-1.5 border-l border-[rgba(194,182,154,0.24)] pl-3.5">
                  {group.children.map((child) => {
                    if (child.href === "/membership/admin/permissions" && !isSuperAdmin) return null;
                    const active = isLinkActive(child.href);
                    const childCount = child.tabKey
                      ? auditCounts[child.tabKey]
                      : child.href === "/membership/admin/enterprise-verifications"
                        ? pendingEnterpriseVerificationCount
                        : 0;
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          scroll={false}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`rounded-xl px-3.5 py-2.5 text-[13px] transition-colors flex items-center justify-between ${
                            active
                              ? "bg-[linear-gradient(135deg,rgba(191,164,118,0.2),rgba(243,235,220,0.86))] text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]"
                              : "text-muted hover:bg-[rgba(245,241,234,0.84)] hover:text-primary"
                          }`}
                        >
                          <span className={active ? "font-medium" : "font-normal"}>{child.label}</span>
                          {group.withAuditBadge && childCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-[11px] text-red-600">{childCount}</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-8 pt-4 border-t border-border">
        <Link
          href="/"
          scroll={false}
          onClick={() => setMobileSidebarOpen(false)}
          className="block px-3 py-2 text-xs text-muted hover:text-accent"
        >
          返回站点
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-[80vh] flex flex-col lg:flex-row">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border bg-surface-elevated/80">
        <div ref={sidebarScrollRef} className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-6 pl-4 pr-2">
          <div className="mb-6 rounded-[24px] border border-[rgba(203,191,170,0.18)] bg-[linear-gradient(180deg,rgba(255,253,249,0.96),rgba(249,244,236,0.9))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_30px_rgba(176,154,116,0.08)]">
            <p className="text-[22px] font-semibold tracking-[0.08em] text-primary">管理后台</p>
            <p className="mt-1 text-[11px] tracking-[0.18em] text-accent/80">ADMIN CONSOLE</p>
            <div className="mt-3 h-px w-16 bg-[linear-gradient(90deg,rgba(180,154,107,0.76),rgba(180,154,107,0.08))]" />
          </div>
          {sidebarNavigation}
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[75]">
          <button
            type="button"
            aria-label="关闭后台导航"
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-2.5 right-auto top-16 h-[calc(100vh-5rem)] w-[86vw] max-w-xs glass-card p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[19px] font-semibold tracking-[0.08em] text-primary">管理后台</p>
                <p className="mt-1 text-[10px] tracking-[0.16em] text-accent/80">ADMIN CONSOLE</p>
                <div className="mt-2 h-px w-12 bg-[linear-gradient(90deg,rgba(180,154,107,0.68),rgba(180,154,107,0.08))]" />
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-primary"
              >
                关闭
              </button>
            </div>
            {sidebarNavigation}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:py-8 lg:px-8">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden mb-4 nav-pill inline-flex items-center rounded-full border border-border bg-surface-elevated/90 px-3.5 py-2 text-sm text-primary"
        >
          打开后台菜单
        </button>
        {children}
      </main>
    </div>
  );
}
