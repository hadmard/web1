"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buildNewsPath } from "@/lib/share-config";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
};

const MOBILE_INITIAL_COUNT = 4;
const MOBILE_PAGE_SIZE = 4;

export function HomeUpdatesNewsList({ items }: { items: NewsItem[] }) {
  const [visibleCount, setVisibleCount] = useState(MOBILE_INITIAL_COUNT);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncVisibleCount = () => {
      setVisibleCount(mediaQuery.matches ? items.length : Math.min(MOBILE_INITIAL_COUNT, items.length));
    };

    syncVisibleCount();
    mediaQuery.addEventListener("change", syncVisibleCount);
    return () => mediaQuery.removeEventListener("change", syncVisibleCount);
  }, [items.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sentinel = sentinelRef.current;
    if (!mediaQuery.matches || !sentinel || visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleCount((current) => Math.min(current + MOBILE_PAGE_SIZE, items.length));
      },
      { rootMargin: "120px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  return (
    <>
      <ul className="list-cascade flex-1 space-y-1.5 md:space-y-2.5">
        {items.map((item, index) => {
          const isVisible = index < visibleCount;
          return (
            <li key={item.id} className={`${isVisible ? "flex" : "hidden"} min-w-0 items-start gap-1.5 md:flex md:items-center md:gap-2`}>
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black md:mt-0 md:h-1.5 md:w-1.5" aria-hidden />
              <Link href={buildNewsPath(item.id)} className="line-clamp-2 text-[12px] leading-4.5 text-primary hover:text-accent md:line-clamp-1 md:text-sm md:leading-normal">
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>

      {visibleCount < items.length ? <div ref={sentinelRef} className="h-1 w-full md:hidden" aria-hidden /> : null}
    </>
  );
}
