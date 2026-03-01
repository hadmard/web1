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
};

export function PublishedContentPanel({
  sectionTitle,
  sectionDesc,
  items,
  categoryHref,
}: PublishedContentPanelProps) {
  return (
    <section className="mt-8">
      <article className="glass-panel p-5 sm:p-6">
        <h2 className="section-label text-primary mb-2">{sectionTitle}</h2>
        {sectionDesc && <p className="text-sm text-muted mb-4">{sectionDesc}</p>}
        {items.length === 0 ? (
          <p className="text-sm text-muted">暂无已发布内容。</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="border-b border-border pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={item.href} className="text-sm text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  {item.editHref && (
                    <Link
                      href={item.editHref}
                      className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40"
                    >
                      提出修改
                    </Link>
                  )}
                </div>
                {item.meta && <p className="mt-1 text-xs text-muted">{item.meta}</p>}
              </li>
            ))}
          </ul>
        )}
        <Link href={categoryHref} className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          查看更多
        </Link>
      </article>
    </section>
  );
}
