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
      <div className={`glass-panel p-2.5 sm:p-3 rounded-2xl ${hero ? "border-white/85 bg-white/88 shadow-[0_24px_56px_-34px_rgba(39,80,117,0.4)]" : ""}`}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 sm:gap-3">
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="行业搜索：请输入标准、术语、榜单关键词"
            className="order-1 flex-1 h-11 px-4 rounded-xl border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
            aria-label="行业搜索关键词"
          />

          <button
            type="submit"
            className="order-2 h-11 px-6 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:brightness-105 transition focus:outline-none focus:ring-2 focus:ring-accent/35"
          >
            搜索
          </button>
        </div>
      </div>
      <p className={`mt-2 text-[13px] ${hero ? "inline-flex rounded-full border border-white/85 bg-white/78 px-3 py-1 text-[#355068] shadow-[0_10px_24px_-18px_rgba(52,87,120,0.45)]" : "text-muted"}`}>
        搜索结果自动分类：标准 / 术语 / 榜单
      </p>
    </form>
  );
}
