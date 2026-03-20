import Link from "next/link";

export function InlinePageBackLink({
  href,
  label = "返回",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated text-primary/75"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path d="M11.7 4.3a1 1 0 0 1 0 1.4L8.4 9H16a1 1 0 1 1 0 2H8.4l3.3 3.3a1 1 0 1 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
      </span>
      <span>{label}</span>
    </Link>
  );
}
