import Image from "next/image";
import Link from "next/link";

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
  return (
    <section className="section-tone-a border-b border-border py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          data-reveal="zoom-soft"
          className="showcase-frame media-zoom-smooth spotlight-card relative mb-6 overflow-hidden rounded-2xl border border-border"
          data-mouse-zone
        >
          <Image src={bannerSrc} alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="showcase-backdrop absolute inset-0" />
          <Image src={bannerSrc} alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="showcase-image absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/82 via-surface/45 to-transparent" />
          <div className="h-44 sm:h-56" />
        </div>

        <h2 data-reveal="fade-up" className="section-label text-primary mb-6">资讯速览</h2>

        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          <article data-reveal="fade-left" data-reveal-delay="60" className="glass-panel spotlight-card p-5 lg:col-span-2 h-full flex flex-col" data-mouse-zone>
            <h3 className="font-serif text-lg font-semibold text-primary mb-3">最新发布</h3>
            <ul className="list-cascade space-y-2.5 flex-1">
              {latestNews.map((item) => (
                <li key={item.id} className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                  <Link href={`/news/${item.slug}`} className="text-sm text-primary hover:text-accent line-clamp-1">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/news/all" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
          </article>

          <article data-reveal="fade-right" data-reveal-delay="120" className="glass-panel spotlight-card p-5 h-full flex flex-col" data-mouse-zone>
            <h3 className="font-serif text-lg font-semibold text-primary mb-3">热门内容</h3>
            <ul className="list-cascade space-y-2.5 flex-1">
              {hotNews.map((item) => (
                <li key={item.id} className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                  <Link href={`/news/${item.slug}`} className="text-sm text-primary hover:text-accent line-clamp-1">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/news/all?sort=latest" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
