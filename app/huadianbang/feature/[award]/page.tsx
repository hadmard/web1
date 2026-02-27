import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { getSpecialAward, HUADIAN_DEFINITION } from "@/lib/huadianbang";

type Props = { params: Promise<{ award: string }> };

export default async function HuadianFeatureDetailPage({ params }: Props) {
  const { award } = await params;
  const item = getSpecialAward(award);
  if (!item) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: item.name,
          description: `${HUADIAN_DEFINITION} ${item.definition}`,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{item.name}</h1>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 grid sm:grid-cols-2 gap-4">
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">奖项定义</h2>
          <p className="mt-2 text-sm text-muted leading-7">{item.definition}</p>
        </article>
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">评选标准</h2>
          <div className="mt-2 space-y-1">
            {item.criteria.map((x) => (
              <h3 key={x} className="text-sm text-primary">{x}</h3>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 glass-panel p-5">
        <h2 className="text-lg font-semibold text-primary">获奖企业</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.winners.map((x) => (
            <h3 key={x} className="px-3 py-1.5 rounded-full border border-border text-sm text-primary">
              {x}
            </h3>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-5">
        <h2 className="text-lg font-semibold text-primary">获奖说明</h2>
        <p className="mt-2 text-sm text-muted leading-7">{item.note}</p>
      </section>
    </main>
  );
}

