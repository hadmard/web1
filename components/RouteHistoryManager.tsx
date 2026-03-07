"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ROUTE_RESTORE_TARGET_STORAGE_KEY,
  buildRouteKey,
  readRouteHistory,
  readScrollPositions,
  writeRouteHistory,
  writeScrollPositions,
} from "@/lib/navigation-memory";

function restoreScrollPosition(routeKey: string) {
  const positions = readScrollPositions();
  const top = positions[routeKey];
  if (typeof top !== "number" || Number.isNaN(top)) return;

  let attempts = 0;
  const apply = () => {
    window.scrollTo({ top, left: 0, behavior: "auto" });
    attempts += 1;
    if (attempts < 8 && document.documentElement.scrollHeight < top + window.innerHeight) {
      window.requestAnimationFrame(apply);
    }
  };

  window.requestAnimationFrame(apply);
}

export function RouteHistoryManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = buildRouteKey(pathname, searchParams.toString());

  useEffect(() => {
    const saveScroll = () => {
      const positions = readScrollPositions();
      positions[routeKey] = window.scrollY;
      writeScrollPositions(positions);
    };

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        saveScroll();
      });
    };

    saveScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", saveScroll);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      saveScroll();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", saveScroll);
    };
  }, [routeKey]);

  useEffect(() => {
    const restoreTarget = sessionStorage.getItem(ROUTE_RESTORE_TARGET_STORAGE_KEY);
    let history = readRouteHistory();

    if (restoreTarget === routeKey) {
      while (history.length > 0 && history[history.length - 1] !== routeKey) {
        history.pop();
      }
      if (history.length === 0) history = [routeKey];
      sessionStorage.removeItem(ROUTE_RESTORE_TARGET_STORAGE_KEY);
      writeRouteHistory(history);
      restoreScrollPosition(routeKey);
      return;
    }

    if (history[history.length - 1] !== routeKey) {
      history.push(routeKey);
      writeRouteHistory(history);
    }
  }, [routeKey]);

  return null;
}
