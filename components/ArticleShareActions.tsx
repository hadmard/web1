"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ArticleShareActionsProps = {
  title: string;
  shareUrl: string;
  siteName: string;
};

export function ArticleShareActions({ title, shareUrl, siteName }: ArticleShareActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(shareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [shareUrl]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setQrLoadFailed(false);
    const image = new window.Image();
    image.src = qrUrl;
    image.onerror = () => setQrLoadFailed(true);
  }, [open, qrUrl]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!open || window.innerWidth >= 768) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const desktopPopup =
    mounted && open
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[260] hidden md:block">
            <div
              ref={popupRef}
              className="pointer-events-auto absolute left-1/2 top-1/2 w-[312px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,247,250,0.99))] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.15),inset_0_1px_0_rgba(255,255,255,0.98)]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium tracking-[0.08em] text-[#111827]">微信扫码分享</p>
                <button
                  type="button"
                  aria-label="关闭分享卡片"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[#374151] hover:bg-[#f3f4f6]"
                >
                  ×
                </button>
              </div>

              <div className="rounded-[18px] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
                {qrLoadFailed ? (
                  <div className="flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[rgba(15,23,42,0.12)] px-4 py-5 text-center">
                    <p className="text-sm leading-6 text-[#4b5563]">二维码暂时加载失败，可以先复制链接发送到微信。</p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white"
                    >
                      {copied ? "已复制链接" : "复制分享链接"}
                    </button>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrUrl}
                    alt={`${title} 分享二维码`}
                    width={232}
                    height={232}
                    className="mx-auto h-auto w-full max-w-[232px] rounded-[14px]"
                    loading="lazy"
                    onError={() => setQrLoadFailed(true)}
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const mobileOverlay =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[260] bg-[rgba(18,22,30,0.8)] md:hidden">
            <button
              type="button"
              aria-label="关闭分享提示"
              className="absolute inset-0"
              onClick={() => setOpen(false)}
            />

            <div className="pointer-events-none absolute right-2 top-4 h-36 w-40">
              <svg viewBox="0 0 160 144" className="h-full w-full" fill="none" aria-hidden="true">
                <path
                  d="M24 118C70 98 98 70 126 24"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="8 11"
                />
                <path
                  d="M114 27L130 21L126 38"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[148px] flex -translate-x-1/2 items-center gap-3 text-white">
              <p className="text-[1.55rem] font-semibold tracking-[0.08em]">点击右上角</p>
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/92 shadow-[0_10px_28px_rgba(255,255,255,0.16)]">
                <div className="flex items-center gap-[5px]">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#3f3f46]" />
                  <span className="h-[6px] w-[6px] rounded-full bg-[#3f3f46]" />
                  <span className="h-[6px] w-[6px] rounded-full bg-[#3f3f46]" />
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[260px] flex w-[270px] -translate-x-1/2 items-start justify-between">
              <div className="flex w-[118px] flex-col items-center">
                <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[24px] bg-white shadow-[0_18px_36px_rgba(0,0,0,0.26)]">
                  <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#4ade80]" fill="currentColor" aria-hidden="true">
                    <path d="M10.6 5.2c-2.6 0-4.9 1-6.4 2.8a1 1 0 0 0 .12 1.44l.92.78a1 1 0 0 0 1.4-.12 5.56 5.56 0 0 1 4-1.8v2.67a1 1 0 0 0 1.72.7l4.7-4.62a1 1 0 0 0 0-1.42l-4.7-4.62a1 1 0 0 0-1.72.7v2.5Z" />
                  </svg>
                </div>
                <p className="mt-4 text-center text-[15px] font-medium text-white">发送给朋友</p>
              </div>

              <div className="flex w-[118px] flex-col items-center">
                <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[24px] bg-white shadow-[0_18px_36px_rgba(0,0,0,0.26)]">
                  <div className="grid h-11 w-11 grid-cols-2 gap-1.5">
                    <span className="rounded-full bg-[#fb923c]" />
                    <span className="rounded-full bg-[#60a5fa]" />
                    <span className="rounded-full bg-[#4ade80]" />
                    <span className="rounded-full bg-[#f472b6]" />
                  </div>
                </div>
                <p className="mt-4 text-center text-[15px] font-medium text-white">分享到朋友圈</p>
              </div>
            </div>

            {qrLoadFailed ? (
              <div className="absolute bottom-12 left-1/2 w-[280px] -translate-x-1/2 rounded-[24px] bg-white/96 p-4 text-center shadow-[0_18px_36px_rgba(0,0,0,0.26)]">
                <p className="text-sm leading-6 text-[#374151]">当前二维码服务不可用，可以先复制分享链接再发送到微信。</p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="mt-3 rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white"
                >
                  {copied ? "已复制分享链接" : "复制分享链接"}
                </button>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative z-20 mt-8 flex justify-end">
      <button
        ref={triggerRef}
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

      {desktopPopup}
      {mobileOverlay}
    </div>
  );
}
