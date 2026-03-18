import Link from "next/link";

type Item = {
  id: string;
  title: string;
  href: string;
  meta?: string;
  editHref?: string;
};

type PublishedContentPanelProps = {
  sectionTitle: string;
  sectionDesc?: string;
  items: Item[];
  categoryHref: string;
  variant?: "default" | "editorial";
};

export function PublishedContentPanel({
  sectionTitle,
  sectionDesc: _sectionDesc,
  items,
  categoryHref,
  variant = "default",
}: PublishedContentPanelProps) {
  const isEditorial = variant === "editorial";
  const isNewsEditorial = isEditorial && categoryHref === "/news/all";

  return (
    <section className="mt-8">
      <article
        className={`glass-panel ${
          isNewsEditorial
            ? "p-6 sm:p-8"
            : isEditorial
              ? "p-6 sm:p-8"
              : "p-5 sm:p-6"
        }`}
      >
        <h2 className="section-label mb-2 text-primary">{sectionTitle}</h2>

        {items.length === 0 ? (
          <p className="text-sm text-muted">暂无已发布内容。</p>
        ) : (
          <ul className={isEditorial ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
            {items.map((item) => (
              <li
                key={item.id}
                className={
                  isNewsEditorial
                    ? "rounded-[20px] border border-border bg-surface-elevated p-4"
                    : isEditorial
                      ? "rounded-[20px] border border-border bg-surface-elevated p-4"
                      : "border-b border-border pb-3"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={`shrink-0 rounded-full bg-black ${isEditorial ? "mt-2 h-1.5 w-1.5" : "mt-1.5 h-1.5 w-1.5"}`} aria-hidden />
                    <Link
                      href={item.href}
                      className={`${isEditorial ? "line-clamp-1 text-[15px] leading-7" : "line-clamp-1 text-sm"} text-primary hover:text-accent`}
                    >
                      {item.title}
                    </Link>
                  </div>

                  {item.editHref ? (
                    <Link
                      href={item.editHref}
                      className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-accent/40 hover:text-accent"
                    >
                      提出修改
                    </Link>
                  ) : null}
                </div>

                {item.meta ? (
                  <p className={`text-muted ${isEditorial ? "mt-3 text-xs uppercase tracking-[0.08em]" : "mt-1 text-xs"}`}>{item.meta}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={categoryHref}
          className={`inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.9))] px-3.5 py-1.5 text-[13px] font-medium text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:text-[#6f5b3d] ${
            isEditorial
              ? "mt-6"
              : "mt-4"
          }`}
        >
          查看更多
          <span aria-hidden="true" className="text-[12px] text-[#b49a6b]">-&gt;</span>
        </Link>
      </article>
    </section>
  );
}
