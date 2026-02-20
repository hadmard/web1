import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ScrollHint } from "@/components/ScrollHint";
import { getCategories } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export default async function HomePage() {
  const categories = await getCategories();
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient bg-mesh border-b border-border-warm dark:border-border-cool min-h-[80vh] flex flex-col hero-section">
        <div className="absolute inset-0 hero-pattern opacity-[0.025] dark:opacity-[0.04]" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24 flex-1 z-10 flex flex-col sm:flex-row items-center gap-10 sm:gap-14">
          <div className="flex-1 min-w-0">
            <p className="hero-eyebrow font-serif text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
              知识基础设施
            </p>
            <h1 className="hero-title font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl">
              <span className="text-gradient">中华整木网</span>
            </h1>
            <div className="mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-teal" aria-hidden />
            <p className="hero-subtitle mt-6 font-sans text-lg sm:text-xl text-muted max-w-2xl font-normal tracking-wide">
              整木行业语义、标准与数据的一站式平台
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/news"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-accent text-white px-5 py-2.5 text-sm font-medium hover:shadow-glow transition-all duration-200 hover:scale-[1.02]"
              >
                整木资讯
              </Link>
              <Link
                href="/market"
                className="inline-flex items-center justify-center rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/80 text-primary px-5 py-2.5 text-sm font-medium hover:border-accent/50 transition-all duration-200 hover:scale-[1.02]"
              >
                整木市场
              </Link>
              <Link
                href="/dictionary"
                className="inline-flex items-center justify-center rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/80 text-primary px-5 py-2.5 text-sm font-medium hover:border-accent-teal/50 transition-all duration-200 hover:scale-[1.02]"
              >
                整木词库
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0 w-full sm:w-80 md:w-96 max-w-md opacity-90">
            <Image
              src="/images/hero-wood.svg"
              alt=""
              width={400}
              height={240}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
        <ScrollHint />
      </section>

      {/* 十大推荐品牌：置顶 */}
      <section className="border-b border-border-warm dark:border-border-cool bg-surface-warm">
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-elevated/80 border border-border-warm dark:border-border-cool flex items-center justify-center">
                <Image src="/images/category-market.svg" alt="" width={28} height={28} className="text-accent-teal" />
              </span>
              <h2 className="section-label text-accent-teal">
                十大推荐品牌
              </h2>
            </div>
            <div className="grid grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 10 }, (_, i) => (
                <Link
                  key={i}
                  href="/market"
                  className="flex flex-col items-center gap-2 rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/80 p-4 transition-all duration-300 hover:border-accent/50 hover:shadow-glow"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-cool dark:bg-surface-tint flex items-center justify-center text-lg font-serif font-semibold text-accent">
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium text-primary">品牌 {i + 1}</span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 全幅金句 */}
      <section className="border-b border-border-warm dark:border-border-cool bg-surface py-16 sm:py-20">
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-4xl mx-auto px-4">
            <Image src="/images/section-divider.svg" alt="" width={800} height={24} className="w-full h-6 mx-auto mb-8 opacity-70" />
            <p className="statement-line font-serif text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-center text-primary">
              以定义为中心 · 以标准为资产 · 以数据为权威
            </p>
            <Image src="/images/section-divider.svg" alt="" width={800} height={24} className="w-full h-6 mx-auto mt-8 opacity-70" />
          </div>
        </ScrollReveal>
      </section>

      {/* 各大类首页：每个大类单独呈现，下列小类 */}
      {categories.map((cat, index) => (
        <section
          key={cat.href}
          className={`border-b ${index % 2 === 0 ? "border-border-cool dark:border-border-warm bg-surface-cool" : "border-border-warm dark:border-border-cool bg-surface-warm"}`}
        >
          <ScrollReveal direction="up" delay={index % 2 === 0 ? 0 : 40}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 flex gap-6 sm:gap-8">
              {CATEGORY_ICONS[cat.href] && (
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-elevated/80 border border-border-warm dark:border-border-cool flex items-center justify-center text-accent">
                  <Image src={CATEGORY_ICONS[cat.href]} alt="" width={40} height={40} className="w-10 h-10 sm:w-11 sm:h-11" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link href={cat.href} className="block group">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-tight group-hover:text-accent transition-colors duration-200">
                    {cat.title}
                  </h2>
                  <p className="mt-1 text-muted text-sm sm:text-base">{cat.desc}</p>
                </Link>
              <ul className="mt-6 flex flex-wrap gap-3">
                {cat.subcategories.map((sub) => (
                  <li key={sub.href}>
                    <Link
                      href={sub.href}
                      className="inline-flex items-center rounded-lg border border-border-warm dark:border-border-cool bg-surface-elevated/80 px-4 py-2 text-sm font-medium text-muted hover:text-accent hover:border-accent/40 transition-all duration-200"
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
              </ul>
                <div className="mt-6">
                  <Link
                    href={cat.href}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    进入{cat.title} →
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      ))}
    </div>
  );
}
