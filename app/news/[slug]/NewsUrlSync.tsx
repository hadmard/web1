"use client";

import { useEffect } from "react";

type NewsUrlSyncProps = {
  canonicalPath: string;
  shareVersion?: string | null;
};

export function NewsUrlSync({ canonicalPath, shareVersion }: NewsUrlSyncProps) {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    let changed = false;

    if (currentUrl.pathname !== canonicalPath) {
      currentUrl.pathname = canonicalPath;
      changed = true;
    }

    if (shareVersion && currentUrl.searchParams.get("sharev") !== shareVersion) {
      currentUrl.searchParams.set("sharev", shareVersion);
      changed = true;
    }

    if (!changed) return;
    window.history.replaceState(window.history.state, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [canonicalPath, shareVersion]);

  return null;
}
