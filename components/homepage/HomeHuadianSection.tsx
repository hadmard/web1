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
  return (
    <section className="section-tone-b border-b border-border py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <article data-reveal="zoom-soft" className="glass-panel p-6 sm:p-7">
          <div className="mb-4 overflow-hidden rounded-xl border border-border">
            <Image
              src={image}
              alt=""
              width={1600}
              height={900}
              sizes="(max-width: 1024px) 100vw, 1152px"
              className="h-40 sm:h-48 w-full object-cover"
            />
          </div>
          <p className="text-[13px] sm:text-sm text-muted">信用推荐体系</p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-primary">华点榜 · 本年度信用推荐</h2>
          <p className="mt-3 text-sm text-muted">华点榜为长期运行信用体系，按年度更新并持续归档公示。</p>
          <div className="mt-6 grid lg:grid-cols-3 gap-4">
            <article className="lg:col-span-2 rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-sm font-semibold text-primary">本年度十大推荐品牌</h3>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
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
              <ul className="mt-3 space-y-1.5">
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
            <Link href={`/huadianbang/${year}`} className="text-sm font-medium text-accent hover:underline">查看完整榜单</Link>
          </div>
        </article>
      </div>
    </section>
  );
}
