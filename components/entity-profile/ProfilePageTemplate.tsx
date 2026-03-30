import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function ProfilePageTemplate({
  breadcrumbs,
  hero,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  hero: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-[#7f6b57]" aria-label="面包屑">
        {breadcrumbs.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="transition hover:text-[#a47b45]">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#2c241d]">{item.label}</span>
            )}
            {index < breadcrumbs.length - 1 ? <span>/</span> : null}
          </span>
        ))}
      </nav>

      {hero}

      <div className="mt-12 space-y-12 sm:mt-16 sm:space-y-16 lg:mt-[72px]">{children}</div>
    </div>
  );
}
