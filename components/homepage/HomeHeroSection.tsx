import Image from "next/image";
import { StructuredSearch } from "@/components/StructuredSearch";

export function HomeHeroSection({ heroBackground }: { heroBackground: string }) {
  const showHeroImage = heroBackground.trim().length > 0;

  return (
    <section className="home-hero-surface relative overflow-hidden border-b border-border py-10 sm:py-28" data-mouse-zone>
      <div className="pointer-events-none absolute inset-0 home-hero-fallback" />
      <div className="pointer-events-none absolute home-hero-bloom-a" />
      <div className="pointer-events-none absolute home-hero-bloom-b" />
      <div className="pointer-events-none absolute home-hero-bloom-c" />
      {showHeroImage && (
        <div className="pointer-events-none absolute inset-0 parallax-layer" data-parallax="0.05">
          <Image
            src={heroBackground}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-22 saturate-[1.05] contrast-[1.01]"
          />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 home-hero-grain" />
      <div className="pointer-events-none absolute inset-0 home-hero-mask" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div data-reveal="zoom-soft" className="hidden text-center sm:block">
          <h1 className="hero-title-stack font-serif text-[2.6rem] sm:text-6xl lg:text-7xl font-semibold tracking-[0.08em] text-[#223548] drop-shadow-[0_10px_24px_rgba(255,255,255,0.45)]">
            <span className="hero-title-line hero-title-line--primary">整木网</span>
            <span className="hero-title-line hero-title-line--secondary text-[0.22em] font-sans tracking-[0.34em] uppercase">
              Industry Intelligence Platform
            </span>
          </h1>
        </div>

        <div data-reveal="fade-up" data-reveal-delay="70" className="mt-3 flex justify-center sm:mt-8">
          <div className="hero-search-shell magnetic-shell w-full max-w-3xl">
            <StructuredSearch hero />
          </div>
        </div>
      </div>
    </section>
  );
}
