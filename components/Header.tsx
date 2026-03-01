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
  const [memberGreeting, setMemberGreeting] = useState<string | null>(
    initialMe ? `${initialMe.name}，你好` : null
  );
  const [memberHref, setMemberHref] = useState<string>(
    initialMe && (initialMe.role === "SUPER_ADMIN" || initialMe.role === "ADMIN")
      ? "/membership/admin"
      : "/membership/content/publish?tab=articles"
  );

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
    <header className="sticky top-3 z-50 px-3 sm:px-5">
      <div className="glass-card relative overflow-visible max-w-6xl mx-auto h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between">
        <Link
          href="/"
          className="site-wordmark font-serif font-semibold text-[17px] sm:text-[19px] tracking-[0.08em] hover:opacity-95 transition-opacity"
        >
          整木网
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto md:overflow-visible no-scrollbar" aria-label="主导航">
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
  );
}
