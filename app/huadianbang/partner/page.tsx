import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { ENGINEER_CATEGORY_LABELS, HUADIAN_DEFINITION } from "@/lib/huadianbang";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";

export default async function HuadianPartnerPage() {
  const visualSettings = await getSiteVisualSettings();
  const heroImage = visualSettings.backgrounds.huadianPartnerHero?.trim() || "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "华点榜配套商推荐",
          description: HUADIAN_DEFINITION,
          url: "/huadianbang/partner",
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl font-semibold text-primary sm:text-4xl">配套商推荐</h1>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          {heroImage ? (
            <Image src={heroImage} alt="" width={1920} height={900} className="h-44 w-full object-cover sm:h-56" />
          ) : (
            <div className="h-44 w-full bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated sm:h-56" />
          )}
        </div>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">分类列表</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ENGINEER_CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/huadianbang/partner/${key}`}
              className="rounded-xl border border-border bg-surface-elevated p-4 hover:border-accent/40"
            >
              <h3 className="text-base font-semibold text-primary">{label}</h3>
              <p className="mt-2 text-sm text-muted">查看该分类下的配套商推荐与详情页。</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
