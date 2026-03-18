"use client";

import { useEffect } from "react";

type NewsUrlSyncProps = {
  canonicalPath: string;
};

export function NewsUrlSync({ canonicalPath }: NewsUrlSyncProps) {
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === canonicalPath) return;
    const nextUrl = `${canonicalPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [canonicalPath]);

  return null;
}
