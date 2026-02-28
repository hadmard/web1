"use client";

import { useEffect } from "react";

type Props = { slug: string };

export function NewsViewTracker({ slug }: Props) {
  useEffect(() => {
    const normalizedSlug = (slug || "").trim();
    if (!normalizedSlug) return;

    const key = `news-view:${normalizedSlug}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");

    void fetch(`/api/news/${encodeURIComponent(normalizedSlug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, [slug]);

  return null;
}
