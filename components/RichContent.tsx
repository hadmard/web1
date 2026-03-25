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

export function RichContent({ html, className }: RichContentProps) {
  const safe = rewriteUploadedImageSources(sanitizeRichText(html || ""));
  const mergedClassName = ["rich-editor-content", className].filter(Boolean).join(" ");
  return <div className={mergedClassName} dangerouslySetInnerHTML={{ __html: safe }} />;
}
