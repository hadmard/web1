import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type RichContentProps = {
  html: string;
  className?: string;
};

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
}

function rewriteUploadedImageSources(html: string): string {
  return html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (_match, prefix, src, suffix) => {
    return `${prefix}${resolveUploadedImageUrl(src)}${suffix}`;
  });
}

export function RichContent({ html, className }: RichContentProps) {
  const safe = rewriteUploadedImageSources(sanitizeHtml(html || ""));
  const mergedClassName = ["rich-editor-content", className].filter(Boolean).join(" ");
  return <div className={mergedClassName} dangerouslySetInnerHTML={{ __html: safe }} />;
}
