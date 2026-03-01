"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  isMembership?: boolean;
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
  const [memberGreeting, setMemberGreeting] = useState<string | null>(
    initialMe ? `${initialMe.name}，你好` : null
  );
  const [memberHref, setMemberHref] = useState<string>(
    initialMe && (initialMe.role === "SUPER_ADMIN" || initialMe.role === "ADMIN")
      ? "/membership/admin"
      : "/membership/content/publish?tab=articles"
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setMe(null);
        setMemberGreeting(null);
        setMemberHref("/membership");
        return;
      }
      const meData = await res.json();
      const account = (typeof meData.account === "string" && meData.account.trim()) || "会员";
      const name = typeof meData.name === "string" && meData.name.trim() ? meData.name.trim() : account;
      const role = typeof meData.role === "string" ? meData.role : null;
      setMe({ name, account, role });
      setMemberGreeting(`${name}，你好`);
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
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

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
    setMemberGreeting(null);
    setMemberHref("/membership");
    router.push("/membership");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-2.5 sm:top-3 z-50 px-2.5 sm:px-5">
        <div className="glass-card relative overflow-visible max-w-6xl mx-auto h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="site-wordmark font-serif font-semibold text-[17px] sm:text-[19px] tracking-[0.08em] hover:opacity-95 transition-opacity whitespace-nowrap"
          >
            整木网
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2 overflow-x-auto md:overflow-visible no-scrollbar" aria-label="主导航">
            {navItems.map(({ href, label, isMembership, subcategories }) => {
              const isMemberItem = href === "/membership";
              const hasSubcategories = Boolean(subcategories && subcategories.length > 0);
              const showBrandsFallback = href === "/brands" && !hasSubcategories;
              const hoverItems = hasSubcategories
                ? subcategories ?? []
                : showBrandsFallback
                  ? [{ href, label: "更多详情" }]
                  : [];
              const finalLabel = isMemberItem && memberGreeting ? memberGreeting : label;
              const finalHref = isMemberItem ? memberHref : href;
              const avatarText = (me?.name || me?.account || "会").trim().slice(0, 1).toUpperCase();

              return (
                <div
                  key={href}
                  className="relative"
                  onMouseEnter={() => setHovered(href)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <Link
                    href={finalHref}
                    className={`nav-pill inline-flex items-center rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${
                      isMembership
                        ? "text-white bg-[var(--color-accent)] hover:brightness-105"
                        : "text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-surface-elevated)_82%,transparent)]"
                    }`}
                  >
                    {isMemberItem && me ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/25 text-[10px] font-semibold">
                          {avatarText}
                        </span>
                        <span>{finalLabel}</span>
                      </span>
                    ) : (
                      finalLabel
                    )}
                  </Link>

                  {isMemberItem && (
                    <div className={`nav-dropdown absolute top-full left-0 pt-2 z-50 ${hovered === href ? "is-open" : ""}`}>
                      <div className="glass-card min-w-[220px] py-2 px-2">
                        <ul className="space-y-1">
                          {!me ? (
                            <li>
                              <Link
                                href="/membership/login"
                                className="block rounded-lg px-2.5 py-1.5 text-xs text-primary/90 hover:bg-surface hover:text-accent transition-colors"
                              >
                                登录
                              </Link>
                            </li>
                          ) : (
                            <>
                              <li>
                                <Link
                                  href={me.role === "SUPER_ADMIN" || me.role === "ADMIN" ? "/membership/admin" : "/membership/content/publish?tab=articles"}
                                  className="block rounded-lg px-2.5 py-1.5 text-xs text-primary/90 hover:bg-surface hover:text-accent transition-colors"
                                >
                                  进入会员中心
                                </Link>
                              </li>
                              <li>
                                <Link
                                  href="/membership/login"
                                  className="block rounded-lg px-2.5 py-1.5 text-xs text-primary/90 hover:bg-surface hover:text-accent transition-colors"
                                >
                                  切换账号
                                </Link>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  onClick={handleLogout}
                                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-primary/90 hover:bg-surface hover:text-accent transition-colors"
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
                                className="block rounded-lg px-2.5 py-1.5 text-xs text-primary/90 hover:bg-surface hover:text-accent transition-colors"
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
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated/85 text-primary"
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
            <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-1 bg-transparent">
              <div
                className="h-full bg-[var(--color-accent)] origin-left transition-transform duration-100 ease-linear"
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
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
          />
          <div className="absolute left-2.5 right-2.5 top-16 max-h-[calc(100vh-5rem)] overflow-y-auto glass-card p-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">导航</p>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-primary"
              >
                关闭
              </button>
            </div>

            <nav className="mt-3 space-y-2" aria-label="移动端主导航">
              {navItems.map(({ href, label, isMembership, subcategories }) => {
                const isMemberItem = href === "/membership";
                const finalLabel = isMemberItem && memberGreeting ? memberGreeting : label;
                const finalHref = isMemberItem ? memberHref : href;
                const hasSubcategories = Boolean(subcategories && subcategories.length > 0);
                const showBrandsFallback = href === "/brands" && !hasSubcategories;
                const mobileSubItems = hasSubcategories
                  ? subcategories ?? []
                  : showBrandsFallback
                    ? [{ href, label: "更多详情" }]
                    : [];
                const avatarText = (me?.name || me?.account || "会").trim().slice(0, 1).toUpperCase();

                return (
                  <div key={href} className="rounded-xl border border-border bg-surface-elevated/75 p-2">
                    <Link
                      href={finalHref}
                      onClick={closeMobileMenu}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium ${
                        isMembership
                          ? "bg-[var(--color-accent)] text-white"
                          : "text-primary hover:bg-surface"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isMemberItem && me && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold">
                            {avatarText}
                          </span>
                        )}
                        {finalLabel}
                      </span>
                      <span className="text-xs opacity-75">进入</span>
                    </Link>

                    {mobileSubItems.length > 0 && (
                      <ul className="mt-2 ml-2 border-l border-border pl-3 space-y-1">
                        {mobileSubItems.map((sub) => (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              onClick={closeMobileMenu}
                              className="block rounded px-2 py-1.5 text-xs text-primary/90 hover:bg-surface"
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {isMemberItem && (
                      <ul className="mt-2 ml-2 border-l border-border pl-3 space-y-1">
                        {!me ? (
                          <li>
                            <Link
                              href="/membership/login"
                              onClick={closeMobileMenu}
                              className="block rounded px-2 py-1.5 text-xs text-primary/90 hover:bg-surface"
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
                                className="block rounded px-2 py-1.5 text-xs text-primary/90 hover:bg-surface"
                              >
                                进入会员中心
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="/membership/login"
                                onClick={closeMobileMenu}
                                className="block rounded px-2 py-1.5 text-xs text-primary/90 hover:bg-surface"
                              >
                                切换账号
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleLogout();
                                  closeMobileMenu();
                                }}
                                className="w-full text-left rounded px-2 py-1.5 text-xs text-primary/90 hover:bg-surface"
                              >
                                退出登录
                              </button>
                            </li>
                          </>
                        )}
                      </ul>
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
