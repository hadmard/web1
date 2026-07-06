"use client";

import { useEffect } from "react";

type Props = { articleId: string };

export function ArticleViewTracker({ articleId }: Props) {
  useEffect(() => {
    const normalizedArticleId = (articleId || "").trim();
    if (!normalizedArticleId) return;

    const key = `article-view:${normalizedArticleId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");

    void fetch(`/api/article-views/${encodeURIComponent(normalizedArticleId)}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, [articleId]);

  return null;
}
