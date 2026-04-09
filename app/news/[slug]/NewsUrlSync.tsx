"use client";

import { useEffect } from "react";

type NewsUrlSyncProps = {
  canonicalPath: string;
};

const TRACKING_PARAM_NAMES = [
  "sharev",
  "from",
  "utm",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export function NewsUrlSync({ canonicalPath }: NewsUrlSyncProps) {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    let changed = false;

    if (currentUrl.pathname !== canonicalPath) {
      currentUrl.pathname = canonicalPath;
      changed = true;
    }

    for (const paramName of TRACKING_PARAM_NAMES) {
      if (!currentUrl.searchParams.has(paramName)) continue;
      currentUrl.searchParams.delete(paramName);
      changed = true;
    }

    if (!changed) return;
    window.history.replaceState(window.history.state, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [canonicalPath]);

  return null;
}
