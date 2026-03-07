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

export function PageBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = buildRouteKey(pathname, searchParams.toString());

  const fallbackHref = useMemo(() => resolveParentHref(pathname), [pathname]);

  if (pathname === "/") return null;

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
    <div className="sticky top-20 sm:top-24 z-40 max-w-6xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-2 pointer-events-none">
      <button
        type="button"
        onClick={handleBack}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated/95 shadow-sm backdrop-blur px-3.5 py-2 text-sm text-primary transition-colors hover:border-accent/40 hover:text-accent"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M11.7 4.3a1 1 0 0 1 0 1.4L8.4 9H16a1 1 0 1 1 0 2H8.4l3.3 3.3a1 1 0 1 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        <span>{"\u8fd4\u56de\u4e0a\u4e00\u5c42"}</span>
      </button>
    </div>
  );
}
