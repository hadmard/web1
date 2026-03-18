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
  sectionDesc,
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
            ? "rounded-[30px] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,250,0.9))] p-6 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.35)] sm:p-8"
            : isEditorial
              ? "p-6 sm:p-8"
              : "p-5 sm:p-6"
        }`}
      >
        <div className={isNewsEditorial ? "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" : ""}>
          <div>
        <h2 className="section-label mb-2 text-primary">{sectionTitle}</h2>
        {sectionDesc ? (
          <p className={`text-muted ${isNewsEditorial ? "mb-0 max-w-2xl text-sm leading-7 text-black/62" : isEditorial ? "mb-5 text-sm leading-7" : "mb-4 text-sm"}`}>{sectionDesc}</p>
        ) : null}
          </div>
          {isNewsEditorial ? (
            <div className="rounded-full border border-black/8 bg-white/78 px-4 py-2 text-xs uppercase tracking-[0.18em] text-black/46">
              Latest Selection
            </div>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted">暂无已发布内容。</p>
        ) : (
          <ul className={isNewsEditorial ? "mt-8 grid gap-4 md:grid-cols-2" : isEditorial ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
            {items.map((item) => (
              <li
                key={item.id}
                className={
                  isNewsEditorial
                    ? "rounded-[24px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,249,251,0.92))] p-5 shadow-[0_24px_48px_-42px_rgba(15,23,42,0.32)]"
                    : isEditorial
                      ? "rounded-[20px] border border-border bg-surface-elevated p-4"
                      : "border-b border-border pb-3"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={`shrink-0 rounded-full bg-black ${isNewsEditorial ? "mt-2 h-1.5 w-1.5 bg-black/68" : isEditorial ? "mt-2 h-1.5 w-1.5" : "mt-1.5 h-1.5 w-1.5"}`} aria-hidden />
                    <Link
                      href={item.href}
                      className={`${isNewsEditorial ? "line-clamp-2 text-[1.02rem] leading-7 text-black/84" : isEditorial ? "line-clamp-2 text-[15px] leading-7" : "line-clamp-1 text-sm"} text-primary hover:text-accent`}
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
                  <p className={`text-muted ${isNewsEditorial ? "mt-4 text-[11px] uppercase tracking-[0.16em] text-black/45" : isEditorial ? "mt-3 text-xs uppercase tracking-[0.08em]" : "mt-1 text-xs"}`}>{item.meta}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={categoryHref}
          className={`inline-block text-sm font-medium ${
            isNewsEditorial
              ? "mt-8 rounded-full border border-black/8 px-5 py-2.5 text-primary transition hover:border-black/14 hover:bg-black/[0.03]"
              : `text-accent hover:underline ${isEditorial ? "mt-6" : "mt-4"}`
          }`}
        >
          查看更多
        </Link>
      </article>
    </section>
  );
}
