type RichContentProps = {
  html: string;
  className?: string;
};

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
}

export function RichContent({ html, className }: RichContentProps) {
  const safe = sanitizeHtml(html || "");
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
