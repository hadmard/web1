"use client";

import { useId, useMemo, useState } from "react";
import { RichContent } from "@/components/RichContent";

type AboutBrandExpandableProps = {
  html?: string | null;
  plainText?: string;
  fallbackText: string;
};

export function AboutBrandExpandable({ html, plainText = "", fallbackText }: AboutBrandExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const previewText = useMemo(() => plainText.trim() || fallbackText, [fallbackText, plainText]);
  const hasRichContent = Boolean((html || "").trim());
  const shouldShowToggle = previewText.length > 48 || hasRichContent;

  return (
    <div className="max-w-4xl">
      <div id={contentId}>
        {!expanded ? (
          <p className="line-clamp-2 text-[15px] leading-7 text-[#3d3025] sm:text-[16px] sm:leading-8">
            {previewText}
          </p>
        ) : hasRichContent ? (
          <RichContent
            html={html || ""}
            className="prose prose-neutral max-w-none text-[#3d3025] prose-p:my-0 prose-p:leading-8 prose-headings:text-[#241c15]"
          />
        ) : (
          <p className="text-[15px] leading-7 text-[#3d3025] sm:text-[16px] sm:leading-8">{previewText}</p>
        )}
      </div>

      {shouldShowToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#9f7a46] transition hover:text-[#876234]"
        >
          {expanded ? "收起" : "了解更多"}
          <span aria-hidden="true">{expanded ? "↑" : "→"}</span>
        </button>
      ) : null}
    </div>
  );
}
