"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StructuredSearch({ hero = false }: { hero?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div
        className={`flex items-center gap-2 rounded-2xl border p-1.5 ${
          hero
            ? "border-white/90 bg-white/90 shadow-[0_18px_40px_-30px_rgba(39,80,117,0.36)]"
            : "border-border bg-surface-elevated"
        }`}
      >
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入关键词"
          className="h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-4 text-sm text-primary placeholder:text-muted focus:border-accent/35 focus:outline-none focus:ring-2 focus:ring-accent/20"
          aria-label="搜索关键词"
        />

        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-[var(--color-accent)] px-6 text-sm font-medium text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-accent/35"
        >
          搜索
        </button>
      </div>
    </form>
  );
}
