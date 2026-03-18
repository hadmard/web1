import Image from "next/image";
import Link from "next/link";
import { buildNewsPath } from "@/lib/share-config";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
};

export function HomeUpdatesSection({
  bannerSrc,
  latestNews,
  hotNews,
}: {
  bannerSrc: string;
  latestNews: NewsItem[];
  hotNews: NewsItem[];
}) {
  const hasBanner = bannerSrc.trim().length > 0;

  return (
    <section className="section-tone-a border-b border-border py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          data-reveal="zoom-soft"
          className="showcase-frame media-zoom-smooth spotlight-card relative mb-6 overflow-hidden rounded-2xl border border-border"
          data-mouse-zone
        >
          {hasBanner ? (
            <>
              <Image src={bannerSrc} alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="showcase-backdrop absolute inset-0" />
              <Image src={bannerSrc} alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-surface-elevated via-surface to-surface-elevated" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,142,93,0.18),transparent_32%)]" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-surface/82 via-surface/45 to-transparent" />
          <div className="h-44 sm:h-56" />
        </div>

        <h2 data-reveal="fade-up" className="section-label mb-6 text-primary">资讯速览</h2>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <article data-reveal="fade-left" data-reveal-delay="60" className="glass-panel spotlight-card flex h-full flex-col p-5 lg:col-span-2" data-mouse-zone>
            <h3 className="mb-3 font-serif text-lg font-semibold text-primary">最新发布</h3>
            <ul className="list-cascade flex-1 space-y-2.5">
              {latestNews.map((item) => (
                <li key={item.id} className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                  <Link href={buildNewsPath(item.id)} className="line-clamp-1 text-sm text-primary hover:text-accent">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/news/all" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              查看更多
            </Link>
          </article>

          <article data-reveal="fade-right" data-reveal-delay="120" className="glass-panel spotlight-card flex h-full flex-col p-5" data-mouse-zone>
            <h3 className="mb-3 font-serif text-lg font-semibold text-primary">热门内容</h3>
            <ul className="list-cascade flex-1 space-y-2.5">
              {hotNews.map((item) => (
                <li key={item.id} className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                  <Link href={buildNewsPath(item.id)} className="line-clamp-1 text-sm text-primary hover:text-accent">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/news/all?sort=latest" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              查看更多
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
