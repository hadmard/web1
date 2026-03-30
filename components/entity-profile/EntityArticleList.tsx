import Link from "next/link";
import type { ReactNode } from "react";

type ArticleCardItem = {
  id: string;
  title: string;
  excerpt: string;
  meta: string;
  href: string;
  badge: string;
};

export function EntityArticleList({
  title,
  eyebrow,
  description,
  aside,
  items,
  footer,
  id,
}: {
  title: string;
  eyebrow?: string;
  description?: string | null;
  aside?: ReactNode;
  items: ArticleCardItem[];
  footer?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id}>
      <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] text-[#9f7a46]">{eyebrow}</p> : null}
          <h2 className="mt-3 font-serif text-3xl text-[#241c15] sm:text-4xl">{title}</h2>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6a5949]">{description}</p> : null}
        </div>
        {aside}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group rounded-[22px] border border-[rgba(140,111,78,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,243,236,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(35,26,18,0.05)] transition hover:-translate-y-0.5 sm:rounded-[24px]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-[rgba(255,249,238,0.92)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#a47b45]">
                {item.badge}
              </span>
              <span className="text-xs text-[#8c7b69]">{item.meta}</span>
            </div>
            <p className="mt-4 text-xl font-medium leading-8 text-[#241c15]">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-[#5c4d40]">{item.excerpt}</p>
            <div className="mt-5 text-sm font-medium text-[#a47b45] transition group-hover:translate-x-0.5">继续阅读</div>
          </Link>
        ))}
      </div>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </section>
  );
}
