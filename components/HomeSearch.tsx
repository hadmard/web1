"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/dictionary?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex rounded-lg border border-border bg-surface-elevated overflow-hidden">
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索词条、标准、品牌…"
          className="flex-1 min-w-0 px-4 py-3 text-primary bg-transparent border-0 text-sm placeholder:text-muted focus:outline-none focus:ring-0"
          aria-label="搜索"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-primary text-surface-elevated text-sm font-medium hover:opacity-90 transition-opacity"
        >
          搜索
        </button>
      </div>
    </form>
  );
}
