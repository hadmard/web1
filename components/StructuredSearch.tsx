"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StructuredSearch({ hero = false }: { hero?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className={`glass-panel rounded-2xl p-2.5 sm:p-3 ${hero ? "border-white/85 bg-white/88 shadow-[0_24px_56px_-34px_rgba(39,80,117,0.4)]" : ""}`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="行业搜索：请输入标准、术语、榜单关键词"
            className="h-11 flex-1 rounded-xl border border-border bg-surface px-4 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
            aria-label="行业搜索关键词"
          />

          <button
            type="submit"
            aria-label="搜索"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-accent/35 sm:px-5"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9 15a6 6 0 1 1 4.243-1.757L17 17" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">搜索</span>
          </button>
        </div>
      </div>

      <p className={`mt-2 text-[13px] ${hero ? "inline-flex rounded-full border border-white/85 bg-white/78 px-3 py-1 text-[#355068] shadow-[0_10px_24px_-18px_rgba(52,87,120,0.45)]" : "text-muted"}`}>
        搜索结果自动分类：标准 / 术语 / 榜单 / 品牌
      </p>
    </form>
  );
}
