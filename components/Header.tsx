"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  isMembership?: boolean;
  external?: boolean;
  desc?: string;
  subcategories?: { href: string; label: string }[];
};

type MeState = {
  name: string;
  account: string;
  role: string | null;
};

export function Header({
  navItems,
  initialMe = null,
}: {
  navItems: NavItem[];
  initialMe?: MeState | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [me, setMe] = useState<MeState | null>(initialMe);
  const [readingProgress, setReadingProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [memberHref, setMemberHref] = useState<string>(
    initialMe && (initialMe.role === "SUPER_ADMIN" || initialMe.role === "ADMIN")
      ? "/membership/admin"
      : "/membership/content/publish?tab=articles"
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setMe(null);
        setMemberHref("/membership");
        return;
      }
      const meData = await res.json();
      const account = (typeof meData.account === "string" && meData.account.trim()) || "会员";
      const name = typeof meData.name === "string" && meData.name.trim() ? meData.name.trim() : account;
      const role = typeof meData.role === "string" ? meData.role : null;
      setMe({ name, account, role });
      setMemberHref(role === "SUPER_ADMIN" || role === "ADMIN" ? "/membership/admin" : "/membership/content/publish?tab=articles");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe, pathname]);

  useEffect(() => {
    const onFocus = () => void loadMe();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadMe]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  useEffect(() => {
    const isNewsReadingPage = pathname.startsWith("/news/") && pathname !== "/news/all";
    if (!isNewsReadingPage) {
      setReadingProgress(0);
      return;
    }

    let rafId = 0;

    const updateProgress = () => {
      const articleEl = document.getElementById("news-reading-article");
      if (!articleEl) {
        setReadingProgress(0);
        return;
      }

      const rect = articleEl.getBoundingClientRect();
      const startY = window.scrollY + rect.top;
      const maxScrollable = Math.max(articleEl.scrollHeight - window.innerHeight, 1);
      const raw = (window.scrollY - startY) / maxScrollable;
      const next = Math.max(0, Math.min(1, raw));
      setReadingProgress(next);
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setMe(null);
    setMemberHref("/membership");
    closeMobileMenu();
    router.push("/membership");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-2.5 sm:top-3 z-50 px-2.5 sm:px-5">
        <div className="glass-card relative overflow-visible max-w-6xl mx-auto h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap hover:opacity-95 transition-opacity"
          >
            <span className="site-wordmark font-serif font-semibold text-[17px] sm:text-[19px] tracking-[0.08em]">
              {"\u6574\u6728\u7f51"}
            </span>
            <span className="max-w-[9.5rem] truncate text-[10px] leading-none text-muted sm:max-w-[16rem] sm:text-[11px] md:max-w-none md:text-xs">
              {"\u6574\u4f53\u6728\u4f5c\u884c\u4e1a\u77e5\u8bc6\u5171\u4eab\u5e73\u53f0"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2 overflow-x-auto md:overflow-visible no-scrollbar" aria-label="主导航">
            {navItems.map(({ href, label, isMembership, external, subcategories }) => {
              const isMemberItem = href === "/membership";
              const hasSubcategories = Boolean(subcategories && subcategories.length > 0);
              const showBrandsFallback = href === "/brands" && !hasSubcategories;
              const hoverItems = hasSubcategories
                ? subcategories ?? []
                : showBrandsFallback
                  ? [{ href, label: "更多详情" }]
                  : [];
              const finalLabel = label;
              const finalHref = isMemberItem ? memberHref : href;

              return (
                <div
                  key={href}
                  className="relative"
                  onMouseEnter={() => setHovered(href)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <Link
                    href={finalHref}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className={`nav-pill inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] sm:text-sm font-medium whitespace-nowrap ${
                      isMembership
                        ? "border border-[rgba(194,182,154,0.26)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,231,0.94))] text-primary shadow-[0_10px_24px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:bg-[linear-gradient(180deg,rgba(255,253,248,0.99),rgba(250,245,237,0.96))] hover:text-primary"
                        : "text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-surface-elevated)_82%,transparent)]"
                    }`}
                  >
                    {finalLabel}
                  </Link>

                  {isMemberItem && (
                    <div className={`nav-dropdown absolute top-full left-0 pt-2 z-50 ${hovered === href ? "is-open" : ""}`}>
                      <div className="glass-card min-w-[220px] py-2 px-2">
                        <ul className="space-y-1">
                          {!me ? (
                            <li>
                              <Link
                                href="/membership/login"
                                className="block rounded-lg px-2.5 py-1.5 text-[13px] text-primary/90 transition-colors hover:bg-[rgba(250,245,237,0.82)] hover:text-[#8a734d]"
                              >
                                登录
                              </Link>
                            </li>
                          ) : (
                            <>
                              <li>
                                <Link
                                  href={me.role === "SUPER_ADMIN" || me.role === "ADMIN" ? "/membership/admin" : "/membership/content/publish?tab=articles"}
                                  className="block rounded-lg px-2.5 py-1.5 text-[13px] text-primary/90 transition-colors hover:bg-[rgba(250,245,237,0.82)] hover:text-[#8a734d]"
                                >
                                  进入会员中心
                                </Link>
                              </li>
                              <li>
                                <Link
                                  href="/membership/login"
                                  className="block rounded-lg px-2.5 py-1.5 text-[13px] text-primary/90 transition-colors hover:bg-[rgba(250,245,237,0.82)] hover:text-[#8a734d]"
                                >
                                  切换账号
                                </Link>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  onClick={handleLogout}
                                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-primary/90 transition-colors hover:bg-[rgba(250,245,237,0.82)] hover:text-[#8a734d]"
                                >
                                  退出登录
                                </button>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {!isMemberItem && hoverItems.length > 0 && (
                    <div className={`nav-dropdown absolute top-full left-0 pt-2 z-50 ${hovered === href ? "is-open" : ""}`}>
                      <div className="glass-card min-w-[230px] py-2 px-2">
                        <ul className="space-y-1">
                          {hoverItems.map((sub) => (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className="block rounded-lg px-2.5 py-1.5 text-[13px] text-primary/90 transition-colors hover:bg-[rgba(250,245,237,0.82)] hover:text-[#8a734d]"
                              >
                                {sub.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden nav-pill inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated/90 text-primary"
          >
            <span className="sr-only">菜单</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              {mobileMenuOpen ? (
                <path d="M4.2 4.2a1 1 0 0 1 1.4 0L10 8.6l4.4-4.4a1 1 0 1 1 1.4 1.4L11.4 10l4.4 4.4a1 1 0 0 1-1.4 1.4L10 11.4l-4.4 4.4a1 1 0 1 1-1.4-1.4L8.6 10 4.2 5.6a1 1 0 0 1 0-1.4Z" />
              ) : (
                <path d="M3 5.5A1 1 0 0 1 4 4.5h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 4.5A1 1 0 0 1 4 9h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm1 4.5a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H4Z" />
              )}
            </svg>
          </button>

          {pathname.startsWith("/news/") && pathname !== "/news/all" && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[rgba(201,191,168,0.26)]">
              <div
                className="h-full origin-left rounded-full bg-[linear-gradient(90deg,rgba(150,127,83,0.88),rgba(196,175,138,0.8))] transition-transform duration-100 ease-linear"
                style={{ transform: `scaleX(${readingProgress})` }}
              />
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={closeMobileMenu}
          />
          <div className="absolute left-2.5 right-2.5 top-[4.15rem] max-h-[calc(100vh-4.9rem)] overflow-y-auto glass-card p-3.5">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">导航</p>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-full border border-border px-2.5 py-1 text-[13px] text-primary"
              >
                关闭
              </button>
            </div>

            <nav className="mt-3 space-y-2" aria-label="移动端主导航">
              {navItems.map(({ href, label, isMembership, external, subcategories }) => {
                const isMemberItem = href === "/membership";
                const finalLabel = label;
                const finalHref = isMemberItem ? memberHref : href;
                const hasSubcategories = Boolean(subcategories && subcategories.length > 0);
                const showBrandsFallback = href === "/brands" && !hasSubcategories;
                const mobileSubItems = hasSubcategories
                  ? subcategories ?? []
                  : showBrandsFallback
                    ? [{ href, label: "更多详情" }]
                    : [];
                const hasMoreOptions = isMemberItem || mobileSubItems.length > 0;
                const expanded = mobileExpanded === href;
                return (
                  <div key={href} className="rounded-xl border border-border bg-surface-elevated/65 p-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={finalHref}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                        onClick={closeMobileMenu}
                        className={`nav-pill flex-1 inline-flex items-center justify-between rounded-full px-3.5 py-2 text-sm font-medium ${
                          isMembership
                            ? "border border-[rgba(194,182,154,0.26)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,231,0.94))] text-primary shadow-[0_10px_24px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.94)]"
                            : "text-primary bg-surface/65 hover:bg-surface"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="truncate">{finalLabel}</span>
                        </span>
                        <span className="text-[12px] opacity-70">进入</span>
                      </Link>

                      {hasMoreOptions && (
                        <button
                          type="button"
                          aria-label={expanded ? "收起子菜单" : "展开子菜单"}
                          onClick={() => setMobileExpanded((prev) => (prev === href ? null : href))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-primary"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : "rotate-0"}`}
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M5.5 7.5a1 1 0 0 1 1.4 0L10 10.6l3.1-3.1a1 1 0 1 1 1.4 1.4l-3.8 3.8a1 1 0 0 1-1.4 0L5.5 8.9a1 1 0 0 1 0-1.4Z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-2.5 border-l border-border pl-3">
                        {mobileSubItems.length > 0 && (
                          <ul className="space-y-1.5">
                            {mobileSubItems.map((sub) => (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  onClick={closeMobileMenu}
                                  className="block rounded px-2 py-1.5 text-[13px] text-primary/90 hover:bg-surface"
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}

                        {isMemberItem && (
                          <ul className={`space-y-1.5 ${mobileSubItems.length > 0 ? "mt-2.5 pt-2 border-t border-border/70" : ""}`}>
                            {!me ? (
                              <li>
                                <Link
                                  href="/membership/login"
                                  onClick={closeMobileMenu}
                                  className="block rounded px-2 py-1.5 text-[13px] text-primary/90 hover:bg-surface"
                                >
                                  登录
                                </Link>
                              </li>
                            ) : (
                              <>
                                <li>
                                  <Link
                                    href={me.role === "SUPER_ADMIN" || me.role === "ADMIN" ? "/membership/admin" : "/membership/content/publish?tab=articles"}
                                    onClick={closeMobileMenu}
                                    className="block rounded px-2 py-1.5 text-[13px] text-primary/90 hover:bg-surface"
                                  >
                                    进入会员中心
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    href="/membership/login"
                                    onClick={closeMobileMenu}
                                    className="block rounded px-2 py-1.5 text-[13px] text-primary/90 hover:bg-surface"
                                  >
                                    切换账号
                                  </Link>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full text-left rounded px-2 py-1.5 text-[13px] text-primary/90 hover:bg-surface"
                                  >
                                    退出登录
                                  </button>
                                </li>
                              </>
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
