import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { HUADIAN_DEFINITION, specialAwards } from "@/lib/huadianbang";

export default function HuadianFeaturePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "华点榜特色奖项",
          description: HUADIAN_DEFINITION,
          url: "/huadianbang/feature",
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">特色奖项</h1>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">奖项分类</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {specialAwards.map((item) => (
            <article key={item.slug} className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-base font-semibold text-primary">{item.name}</h3>
              <p className="mt-2 text-sm text-muted">{item.definition}</p>
              <Link href={`/huadianbang/feature/${item.slug}`} className="mt-2 inline-block text-sm text-accent hover:underline">
                查看奖项页面
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

