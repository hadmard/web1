"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ROUTE_RESTORE_TARGET_STORAGE_KEY,
  buildRouteKey,
  readRouteHistory,
  readScrollPositions,
  writeScrollPositions,
} from "@/lib/navigation-memory";

function resolveParentHref(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return `/${segments.slice(0, -1).join("/")}`;
}

function shouldShowBackButton(pathname: string) {
  if (pathname === "/") return false;

  const detailRoutePatterns = [
    /^\/news\/[^/]+$/,
    /^\/dictionary\/[^/]+$/,
    /^\/standards\/[^/]+$/,
    /^\/awards\/[^/]+$/,
    /^\/data\/[^/]+$/,
    /^\/gallery\/[^/]+$/,
    /^\/enterprise\/[^/]+$/,
    /^\/brands\/[^/]+$/,
    /^\/tags\/[^/]+\/[^/]+$/,
    /^\/huadianbang\/\d{4}$/,
    /^\/huadianbang\/\d{4}\/[^/]+$/,
    /^\/huadianbang\/feature\/[^/]+$/,
    /^\/huadianbang\/partner\/[^/]+$/,
    /^\/huadianbang\/partner\/[^/]+\/[^/]+$/,
    /^\/info\/[^/]+$/,
    /^\/companynews\/[^/]+$/,
  ];

  return detailRoutePatterns.some((pattern) => pattern.test(pathname));
}

export function PageBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = buildRouteKey(pathname, searchParams.toString());
  const isNewsArticlePage = /^\/news\/[^/]+$/.test(pathname) && pathname !== "/news/all";

  const fallbackHref = useMemo(() => resolveParentHref(pathname), [pathname]);

  if (!shouldShowBackButton(pathname)) return null;

  const handleBack = () => {
    const history = readRouteHistory();
    const targetHref =
      history.length > 1 && history[history.length - 1] === routeKey
        ? history[history.length - 2]
        : fallbackHref;

    const positions = readScrollPositions();
    positions[routeKey] = window.scrollY;
    writeScrollPositions(positions);

    sessionStorage.setItem(ROUTE_RESTORE_TARGET_STORAGE_KEY, targetHref);
    router.push(targetHref, { scroll: false });
  };

  return (
    <div className={`sticky z-40 mx-auto max-w-6xl px-4 pb-2 pointer-events-none sm:px-6 ${isNewsArticlePage ? "top-[4.55rem] pt-3 sm:top-24 sm:pt-4" : "top-[4.65rem] pt-2.5 sm:top-24 sm:pt-4"}`}>
      <button
        type="button"
        onClick={handleBack}
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-primary backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:text-accent sm:px-3.5 sm:py-2 sm:text-sm ${
          isNewsArticlePage
            ? "border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.96)] shadow-[0_16px_32px_rgba(15,23,42,0.08)] hover:border-[rgba(138,115,77,0.22)] hover:bg-white sm:border-[rgba(15,23,42,0.08)] sm:bg-[rgba(255,255,255,0.96)] sm:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
            : "border border-[rgba(148,163,184,0.28)] bg-[rgba(241,245,249,0.88)] shadow-[0_10px_26px_rgba(15,23,42,0.07)] hover:border-accent/25 hover:bg-[rgba(248,250,252,0.96)]"
        }`}
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8 ${isNewsArticlePage ? "bg-white text-primary/80 ring-1 ring-[rgba(15,23,42,0.08)]" : "bg-[rgba(255,255,255,0.55)] text-primary/75 ring-1 ring-[rgba(148,163,184,0.16)]"}`}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M11.7 4.3a1 1 0 0 1 0 1.4L8.4 9H16a1 1 0 1 1 0 2H8.4l3.3 3.3a1 1 0 1 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
          </svg>
        </span>
        <span className="pr-1">{"\u8fd4\u56de"}</span>
      </button>
    </div>
  );
}
