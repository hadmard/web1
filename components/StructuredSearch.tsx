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

export function StructuredSearch() {
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
      <div className="glass-panel p-2.5 sm:p-3 rounded-2xl flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SearchType)}
          className="h-11 px-3 rounded-xl border border-border bg-surface text-sm text-primary focus:outline-none"
          aria-label="搜索分类"
        >
          {SEARCH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入关键词，如：华东品牌、工艺标准"
          className="flex-1 h-11 px-4 rounded-xl border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none"
          aria-label="结构化搜索关键词"
        />
        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:brightness-105 transition"
        >
          搜索
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">可检索：品牌、标准、术语、榜单</p>
    </form>
  );
}
