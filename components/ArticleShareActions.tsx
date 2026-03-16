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
          <>
            <div className="absolute bottom-[calc(100%+14px)] right-0 z-50 hidden w-[176px] rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,250,0.98))] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur md:block">
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
            <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.62)] backdrop-blur-[2px] md:hidden">
              <button
                type="button"
                aria-label="关闭分享提示"
                className="absolute inset-0"
                onClick={() => setOpen(false)}
              />
              <div className="pointer-events-none absolute right-5 top-16 text-right text-white">
                <div className="mr-2 text-[2rem] leading-none">↗</div>
                <p className="mt-2 text-[1.9rem] font-semibold tracking-[0.08em]">点击右上角</p>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-6">
                <div className="flex w-[92px] flex-col items-center">
                  <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[24px] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
                    <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#22c55e]" fill="currentColor" aria-hidden="true">
                      <path d="M10.2 6.1c-2 0-4 .9-5.3 2.4a1 1 0 0 0 .1 1.5l.7.6a1 1 0 0 0 1.4-.1 4.8 4.8 0 0 1 3.7-1.6v2.3a1 1 0 0 0 1.7.7l4.2-4.1a1 1 0 0 0 0-1.4l-4.2-4.1a1 1 0 0 0-1.7.7v2.1Z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-center text-[14px] text-white">发送给朋友</p>
                </div>
                <div className="flex w-[92px] flex-col items-center">
                  <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[24px] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
                    <div className="grid h-10 w-10 grid-cols-2 gap-1">
                      <span className="rounded-full bg-[#ef4444]" />
                      <span className="rounded-full bg-[#f59e0b]" />
                      <span className="rounded-full bg-[#22c55e]" />
                      <span className="rounded-full bg-[#3b82f6]" />
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[14px] text-white">分享到朋友圈</p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
