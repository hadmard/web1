import Image from "next/image";
import Link from "next/link";

type TopItem = {
  slug: string;
  name: string;
};

export function HomeHuadianSection({
  image,
  year,
  top10,
  partner,
}: {
  image: string;
  year: string | number;
  top10: TopItem[];
  partner: string[];
}) {
  const hasImage = image.trim().length > 0;

  return (
    <section className="section-tone-b border-b border-border py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <article data-reveal="zoom-soft" className="glass-panel spotlight-card p-6 sm:p-7" data-mouse-zone>
          <div className="showcase-frame media-zoom-smooth mb-4 overflow-hidden rounded-xl border border-border">
            {hasImage ? (
              <Image
                src={image}
                alt={`华点榜 ${year} 年度推荐封面图`}
                width={1600}
                height={900}
                sizes="(max-width: 1024px) 100vw, 1152px"
                className="h-40 w-full object-cover object-[center_38%] sm:h-48"
              />
            ) : (
              <div className="h-40 bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated sm:h-48" />
            )}
          </div>
          <p className="text-[13px] text-muted sm:text-sm">信用推荐体系</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">华点榜 · 本年度信用推荐</h2>
          <p className="mt-3 text-sm text-muted">华点榜作为长期运行的信用体系，按年度更新并持续归档公示。</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-border bg-surface-elevated p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-primary">本年度十大推荐品牌</h3>
              <ul className="list-cascade mt-3 grid gap-2 sm:grid-cols-2">
                {top10.slice(0, 10).map((item) => (
                  <li key={item.slug}>
                    <Link href={`/huadianbang/${year}/${item.slug}`} className="text-sm text-primary hover:text-accent">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-sm font-semibold text-primary">本年度配套商推荐</h3>
              <ul className="list-cascade mt-3 space-y-1.5">
                {partner.map((item) => (
                  <li key={item}>
                    <Link href="/huadianbang/partner" className="text-sm text-primary hover:text-accent">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <div className="mt-6">
            <Link href={`/huadianbang/${year}`} className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.9))] px-3.5 py-1.5 text-[13px] font-medium text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:text-[#6f5b3d]">
              查看完整榜单
              <span aria-hidden="true" className="text-[12px] text-[#b49a6b]">-&gt;</span>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
