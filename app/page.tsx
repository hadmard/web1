import { ScrollMotion } from "@/components/ScrollMotion";
import { StructuredSearch } from "@/components/StructuredSearch";

export const revalidate = 300;

export default async function HomePage() {
  return (
    <main className="min-h-[calc(100vh-8.5rem)]">
      <ScrollMotion />

      <section className="home-hero-surface relative overflow-hidden border-b border-border py-14 sm:py-20" data-mouse-zone>
        <div className="pointer-events-none absolute inset-0 home-hero-fallback" />
        <div className="pointer-events-none absolute home-hero-bloom-a" />
        <div className="pointer-events-none absolute home-hero-bloom-b" />
        <div className="pointer-events-none absolute home-hero-bloom-c" />
        <div className="pointer-events-none absolute inset-0 home-hero-grain" />
        <div className="pointer-events-none absolute inset-0 home-hero-mask" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal="fade-up" className="mx-auto max-w-4xl">
            <StructuredSearch hero />
          </div>
        </div>
      </section>
    </main>
  );
}
