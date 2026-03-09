import Image from "next/image";
import Link from "next/link";
import type { HomepageStructureCard } from "@/lib/homepage-data";

function pick<T>(arr: T[], n: number) {
  return arr.slice(0, n);
}

export function HomeStructureSection({ cards }: { cards: HomepageStructureCard[] }) {
  return (
    <section className="section-tone-b border-b border-border py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-4" data-reveal-stagger="85">
          {cards.map((card) => (
            <article key={card.title} data-reveal="zoom-soft" className="glass-panel p-5 sm:p-6 relative overflow-hidden h-full">
              <div className="relative flex h-full flex-col">
                <div className="mb-4 overflow-hidden rounded-xl border border-border">
                  <Image
                    src={card.image}
                    alt=""
                    width={1200}
                    height={700}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px"
                    className="h-32 w-full object-cover"
                  />
                </div>
                <p className="text-[13px] sm:text-sm text-muted">{card.subtitle}</p>
                <h3 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-primary">{card.title}</h3>
                <p className="mt-2 text-sm text-muted">{card.desc}</p>

                <ul className="mt-4 space-y-2 flex-1">
                  {pick(card.items, 5).map((item, idx) => (
                    <li key={item.href + idx} className="flex items-center gap-2 min-w-0">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                      <Link href={item.href} className="text-sm text-primary hover:text-accent line-clamp-1">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link href={card.href} className="mt-5 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
