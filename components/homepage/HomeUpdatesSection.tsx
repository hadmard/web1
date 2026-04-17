import Image from "next/image";
import Link from "next/link";
import { HomeUpdatesNewsList } from "@/components/homepage/HomeUpdatesNewsList";

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
    <section className="section-tone-a border-b border-border py-8 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          data-reveal="zoom-soft"
          className="showcase-frame media-zoom-smooth spotlight-card relative mb-5 hidden overflow-hidden rounded-2xl border border-border sm:mb-6 sm:block"
          data-mouse-zone
        >
          {hasBanner ? (
            <>
              <Image src={bannerSrc} alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="showcase-backdrop absolute inset-0" />
              <Image
                src={bannerSrc}
                alt="整木资讯速览栏目横幅"
                fill
                sizes="(max-width: 1024px) 100vw, 1152px"
                className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
              />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-surface-elevated via-surface to-surface-elevated" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,142,93,0.18),transparent_32%)]" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-surface/82 via-surface/45 to-transparent" />
          <div className="h-28 sm:h-56" />
        </div>

        <h2 data-reveal="fade-up" className="section-label mb-3 text-primary sm:mb-6">资讯速览</h2>

        <div className="grid items-stretch gap-3 sm:gap-4 lg:grid-cols-2">
          <article data-reveal="fade-left" data-reveal-delay="60" className="glass-panel spotlight-card flex h-full flex-col rounded-[18px] p-3 sm:rounded-[20px] sm:p-5" data-mouse-zone>
            <h3 className="mb-2 font-serif text-[15px] font-semibold text-primary sm:mb-3 sm:text-lg">最新发布</h3>
            <HomeUpdatesNewsList items={latestNews} />
            <Link href="/news/all" className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.9))] px-2.5 py-1 text-[12px] font-medium text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:text-[#6f5b3d] sm:mt-4 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[13px]">
              查看更多
              <span aria-hidden="true" className="text-[12px] text-[#b49a6b]">-&gt;</span>
            </Link>
          </article>

          <article data-reveal="fade-right" data-reveal-delay="120" className="glass-panel spotlight-card flex h-full flex-col rounded-[18px] p-3 sm:rounded-[20px] sm:p-5" data-mouse-zone>
            <h3 className="mb-2 font-serif text-[15px] font-semibold text-primary sm:mb-3 sm:text-lg">热门内容</h3>
            <HomeUpdatesNewsList items={hotNews} />
            <Link href="/news/all" className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.9))] px-2.5 py-1 text-[12px] font-medium text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:text-[#6f5b3d] sm:mt-4 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[13px]">
              查看更多
              <span aria-hidden="true" className="text-[12px] text-[#b49a6b]">-&gt;</span>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
