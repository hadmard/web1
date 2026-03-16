"use client";

import { useMemo, useState } from "react";

type ArticleShareActionsProps = {
  title: string;
  url: string;
  siteName: string;
};

type ShareTarget = "friend" | "moments";

const TARGET_LABEL: Record<ShareTarget, string> = {
  friend: "微信好友",
  moments: "朋友圈",
};

export function ArticleShareActions({ title, url, siteName }: ArticleShareActionsProps) {
  const [tip, setTip] = useState("");
  const [panel, setPanel] = useState<ShareTarget | null>(null);

  const shareTitle = useMemo(() => `${title} | ${siteName}`, [siteName, title]);
  const shareText = useMemo(() => `${shareTitle} ${url}`, [shareTitle, url]);
  const isWeChat =
    typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent || "");

  async function copyShareText(message: string) {
    try {
      await navigator.clipboard.writeText(shareText);
      setTip(message);
      return true;
    } catch {
      setTip(`已准备分享文案，请手动复制链接：${url}`);
      return false;
    }
  }

  async function handleShare(target: ShareTarget) {
    if (isWeChat) {
      await copyShareText(`已复制分享文案，请在右上角菜单选择“${TARGET_LABEL[target]}”`);
      setPanel(target);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url,
        });
        setTip(`已调起系统分享，可继续发送到${TARGET_LABEL[target]}`);
        return;
      } catch {
        // fall through to copy
      }
    }

    await copyShareText(`已复制分享文案，可粘贴发送到${TARGET_LABEL[target]}`);
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">分享这篇资讯</h2>
          <p className="mt-1 text-sm text-muted">分享时将显示“{title}”和“{siteName}”。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleShare("friend")}
            className="rounded-full bg-[#07c160] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            微信好友
          </button>
          <button
            type="button"
            onClick={() => void handleShare("moments")}
            className="rounded-full border border-[#07c160] px-4 py-2 text-sm font-medium text-[#07c160] transition-colors hover:bg-[#07c160]/10"
          >
            朋友圈
          </button>
        </div>
      </div>

      {tip ? <p className="mt-3 text-sm text-muted">{tip}</p> : null}

      {panel ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white/70 px-4 py-3 text-sm text-muted">
          <p className="font-medium text-primary">微信内分享提示</p>
          <p className="mt-1">1. 点击右上角“...”。</p>
          <p>2. 选择“{TARGET_LABEL[panel]}”。</p>
          <p>3. 分享标题会优先显示文章标题，来源名称显示为“{siteName}”。</p>
        </div>
      ) : null}
    </section>
  );
}
