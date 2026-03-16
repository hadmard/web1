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

  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${data}`;
  }, [url]);

  async function handleCopy() {
    const shareText = `${title}\n${url}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTip("已复制文章标题和链接，可直接粘贴发送。");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setTip(`复制失败，请手动复制链接：${url}`);
    }
  }

  return (
    <section className="mt-12 overflow-hidden rounded-[36px] border border-[rgba(160,132,96,0.16)] bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(247,241,233,0.94)_52%,rgba(243,235,226,0.98))] shadow-[0_26px_70px_rgba(52,38,24,0.08)]">
      <div className="flex flex-col gap-8 px-6 py-7 sm:px-8 lg:flex-row lg:items-stretch lg:gap-0 lg:px-10 lg:py-9">
        <div className="relative max-w-[36rem] flex-1 lg:pr-10">
          <div className="absolute left-0 top-0 h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(192,160,118,0.22),rgba(192,160,118,0))]" />
          <p className="relative text-[11px] uppercase tracking-[0.34em] text-[#947655]">Article Share</p>
          <h2 className="relative mt-3 font-serif text-[1.9rem] font-semibold tracking-[0.1em] text-[#231b15]">
            分享本文
          </h2>
          <div className="relative mt-5 border-l border-[rgba(160,132,96,0.26)] pl-5">
            <p className="font-serif text-[1.05rem] leading-8 tracking-[0.03em] text-[#2c241d]">{title}</p>
            <p className="mt-3 text-sm leading-7 text-[#6f6255]">
              扫码后可在微信中直接打开文章，再通过右上角菜单转发给朋友或分享到朋友圈。
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-full bg-[#261d16] px-6 py-2.5 text-sm font-medium tracking-[0.08em] text-[#f8f3ec] transition-colors hover:bg-[#3a2d22]"
            >
              {copied ? "已复制" : "复制链接"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[rgba(160,132,96,0.24)] bg-[rgba(255,255,255,0.56)] px-6 py-2.5 text-sm font-medium tracking-[0.08em] text-[#6f5842] transition-colors hover:bg-[rgba(255,255,255,0.78)]"
            >
              新窗口打开
            </a>
          </div>
          <div className="mt-5 flex items-center gap-3 text-[12px] tracking-[0.16em] text-[#9a7f62]">
            <span className="h-px w-10 bg-[rgba(160,132,96,0.26)]" />
            <span>{siteName}</span>
          </div>
          {tip ? <p className="mt-3 text-sm text-[#8a7458]">{tip}</p> : null}
        </div>

        <div className="relative lg:w-[320px] lg:pl-10">
          <div className="absolute inset-y-0 left-0 hidden w-px bg-[linear-gradient(180deg,rgba(160,132,96,0),rgba(160,132,96,0.24),rgba(160,132,96,0))] lg:block" />
          <div className="mx-auto w-full max-w-[260px] rounded-[30px] border border-[rgba(160,132,96,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(249,243,235,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_18px_44px_rgba(54,38,20,0.08)]">
            <div className="rounded-[24px] bg-white p-3 shadow-[0_14px_30px_rgba(39,27,16,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`${title} 分享二维码`}
                width={280}
                height={280}
                className="h-auto w-full rounded-[20px]"
                loading="lazy"
              />
            </div>
            <p className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-[#947655]">Wechat Scan</p>
          </div>
        </div>
      </div>
    </section>
  );
}
