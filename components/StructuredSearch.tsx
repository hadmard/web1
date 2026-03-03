"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SearchType = "brand" | "standard" | "term" | "award";

const SEARCH_TYPES: Array<{ value: SearchType; label: string }> = [
  { value: "brand", label: "品牌" },
  { value: "standard", label: "标准" },
  { value: "term", label: "术语" },
  { value: "award", label: "榜单" },
];

function targetFor(type: SearchType, q: string) {
  const term = encodeURIComponent(q);
  switch (type) {
    case "brand":
      return `/brands/all?q=${term}`;
    case "standard":
      return `/standards/all?q=${term}`;
    case "term":
      return `/dictionary/all?q=${term}`;
    case "award":
      return `/awards?q=${term}`;
    default:
      return `/dictionary/all?q=${term}`;
  }
}

export function StructuredSearch({ hero = false }: { hero?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<SearchType>("term");
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(targetFor(type, term));
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className={`glass-panel p-2.5 sm:p-3 rounded-2xl ${hero ? "border-white/45 bg-white/86 shadow-[0_26px_64px_-34px_rgba(3,12,22,0.75)]" : ""}`}>
        <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr_auto] gap-2.5 sm:gap-3">
          <div className="relative order-2 sm:order-1">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SearchType)}
              className="h-11 w-full appearance-none px-3 rounded-xl border border-border bg-surface text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/25"
              aria-label="搜索分类"
            >
              {SEARCH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.5 7.5a1 1 0 0 1 1.4 0L10 10.6l3.1-3.1a1 1 0 0 1 1.4 1.4l-3.8 3.8a1 1 0 0 1-1.4 0L5.5 8.9a1 1 0 0 1 0-1.4Z" />
            </svg>
          </div>

          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="输入关键词，如：华东品牌、工艺标准"
            className="order-1 sm:order-2 flex-1 h-11 px-4 rounded-xl border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
            aria-label="结构化搜索关键词"
          />

          <button
            type="submit"
            className="order-3 h-11 px-6 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:brightness-105 transition focus:outline-none focus:ring-2 focus:ring-accent/35"
          >
            搜索
          </button>
        </div>
      </div>
      <p className={`mt-2 text-[13px] ${hero ? "text-white/95 drop-shadow-[0_2px_10px_rgba(5,12,20,0.55)]" : "text-muted"}`}>
        可检索：品牌、标准、术语、榜单
      </p>
    </form>
  );
}
