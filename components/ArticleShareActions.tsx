"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ArticleShareActionsProps = {
  title: string;
  url: string;
  siteName: string;
};

export function ArticleShareActions({ title, url, siteName }: ArticleShareActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [url]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative z-20 mt-8 flex justify-end">
      <div className="relative">
        <button
          type="button"
          aria-label={`分享 ${siteName} 文章：${title}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="group inline-flex h-11 items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,247,250,0.98))] px-4 shadow-[0_10px_30px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.98)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-[#111827] transition-transform duration-200 group-hover:scale-[1.04]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V5" />
            <path d="M8.5 8.5 12 5l3.5 3.5" />
            <path d="M5 13.5v3a2.5 2.5 0 0 0 2.5 2.5h9a2.5 2.5 0 0 0 2.5-2.5v-3" />
          </svg>
          <span className="text-sm font-medium tracking-[0.08em] text-[#111827]">分享</span>
        </button>

        {open ? (
          <div className="absolute bottom-[calc(100%+14px)] right-0 z-50 w-[176px] rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,250,0.98))] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur">
            <div className="rounded-[18px] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`${title} 分享二维码`}
                width={220}
                height={220}
                className="h-auto w-full rounded-[14px]"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-center text-[11px] tracking-[0.12em] text-[#6b7280]">微信扫码分享</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
