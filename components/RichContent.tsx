import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { sanitizeRichText } from "@/lib/brand-content";

type RichContentProps = {
  html: string;
  className?: string;
};

function rewriteUploadedImageSources(html: string): string {
  return html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (_match, prefix, src, suffix) => {
    return `${prefix}${resolveUploadedImageUrl(src)}${suffix}`;
  });
}

function wrapScrollableTables(html: string): string {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (tableHtml) => {
    if (/^<div\b[^>]*class=["'][^"']*\btable-scroll\b/i.test(tableHtml)) {
      return tableHtml;
    }
    return `<div class="table-scroll">${tableHtml}</div>`;
  });
}

export function RichContent({ html, className }: RichContentProps) {
  const safe = wrapScrollableTables(rewriteUploadedImageSources(sanitizeRichText(html || "")));
  const mergedClassName = ["rich-content-shell", "rich-editor-content", className].filter(Boolean).join(" ");
  return <div className={mergedClassName} dangerouslySetInnerHTML={{ __html: safe }} />;
}
