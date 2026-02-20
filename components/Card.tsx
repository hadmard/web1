import Link from "next/link";

type CardProps = {
  title: string;
  description?: string;
  href?: string;
  children?: React.ReactNode;
};

export function Card({ title, description, href, children }: CardProps) {
  const content = (
    <>
      <span className="font-serif font-medium text-gray-900 dark:text-gray-100">
        {title}
      </span>
      {description && (
        <span className="block text-sm text-[var(--color-muted)] mt-1">
          {description}
        </span>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block p-4 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-[var(--color-border)]">
      {content}
    </div>
  );
}
