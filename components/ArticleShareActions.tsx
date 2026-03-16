"use client";

import { useMemo, useState } from "react";

type ArticleShareActionsProps = {
  title: string;
  url: string;
  siteName: string;
};

export function ArticleShareActions({ title, url, siteName }: ArticleShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [tip, setTip] = useState("");

  const shareTitle = useMemo(() => `${title} | ${siteName}`, [siteName, title]);
  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [url]);

  async function handleCopy() {
    const shareText = `${shareTitle}\n${url}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTip("已复制文章标题和链接，可以直接粘贴发送。");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setTip(`复制失败，请手动复制链接：${url}`);
    }
  }

  return (
    <section className="mt-8 rounded-[28px] border border-border bg-surface px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold text-primary">分享这篇资讯</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            扫码可直接在微信打开文章，分享标题显示为“{title}”，来源显示为“{siteName}”。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-full bg-[#07c160] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {copied ? "已复制" : "复制链接"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-surface-elevated"
            >
              新窗口打开
            </a>
          </div>
          <p className="mt-3 text-sm text-muted">
            微信里可通过右上角菜单转发给朋友或分享到朋友圈。
          </p>
          {tip ? <p className="mt-2 text-sm text-accent">{tip}</p> : null}
        </div>

        <div className="mx-auto w-full max-w-[220px] shrink-0 rounded-[24px] border border-border bg-white p-4 shadow-[0_18px_40px_rgba(16,24,40,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`${title} 分享二维码`}
            width={220}
            height={220}
            className="h-auto w-full rounded-2xl"
            loading="lazy"
          />
          <p className="mt-3 text-center text-xs leading-6 text-muted">微信扫码查看并分享本文</p>
        </div>
      </div>
    </section>
  );
}
