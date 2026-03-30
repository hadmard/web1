import type { ReactNode } from "react";

type EntityHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  meta?: string[];
  badges?: string[];
  logoUrl?: string | null;
  imageAlt?: string;
  backgroundImageUrl?: string | null;
  variant?: "dark" | "light";
  actions?: ReactNode;
  aside?: ReactNode;
};

export function EntityHero({
  eyebrow,
  title,
  subtitle,
  summary,
  meta = [],
  badges = [],
  logoUrl,
  imageAlt,
  backgroundImageUrl,
  variant = "light",
  actions,
  aside,
}: EntityHeroProps) {
  const isDark = variant === "dark";

  return (
    <section
      className={
        isDark
          ? "relative overflow-hidden rounded-[30px] border border-[rgba(140,111,78,0.14)] bg-[#171310] shadow-[0_24px_80px_rgba(32,24,17,0.18)] sm:rounded-[36px] lg:rounded-[40px]"
          : "overflow-hidden rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:rounded-[32px]"
      }
    >
      {backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,5,0.94)_0%,rgba(14,10,8,0.82)_44%,rgba(20,15,11,0.56)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,182,136,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_20%)]" />
        </>
      ) : null}

      <div className={`relative z-10 px-5 py-6 sm:px-8 sm:py-8 ${isDark ? "lg:px-12 lg:py-16" : "lg:px-10 lg:py-10"}`}>
        <div className={`grid items-center gap-6 sm:gap-8 ${aside || logoUrl ? "lg:grid-cols-[minmax(0,1fr),300px]" : ""}`}>
          <div className="max-w-3xl">
            {eyebrow ? (
              <div className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] ${isDark ? "text-white/62" : "text-[#9a8560]"}`}>
                <span>{eyebrow}</span>
              </div>
            ) : null}
            <h1 className={`mt-3 font-serif leading-[1.06] ${isDark ? "text-[2.7rem] text-white sm:text-[3.8rem] lg:text-[4.8rem]" : "text-[2rem] text-primary sm:text-[2.8rem] lg:text-[3.2rem]"}`}>
              {title}
            </h1>
            {subtitle ? (
              <p className={`mt-4 max-w-2xl ${isDark ? "text-xl font-medium leading-snug text-white sm:text-[1.9rem]" : "text-[15px] leading-8 text-primary/88 sm:text-base lg:text-[1.05rem]"}`}>
                {subtitle}
              </p>
            ) : null}
            {summary ? (
              <p className={`mt-4 max-w-3xl text-sm leading-7 sm:text-[15px] sm:leading-8 ${isDark ? "text-white/84" : "text-muted"}`}>{summary}</p>
            ) : null}
            {meta.length > 0 ? (
              <div className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${isDark ? "text-white/60" : "text-primary/56"}`}>
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
            {badges.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((item) => (
                  <span
                    key={item}
                    className={
                      isDark
                        ? "rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-white/88"
                        : "rounded-full border border-[rgba(181,157,121,0.18)] bg-[rgba(255,249,238,0.92)] px-3 py-1 text-xs text-accent"
                    }
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {actions ? <div className="mt-8">{actions}</div> : null}
          </div>

          {aside || logoUrl ? (
            <div className="order-last flex items-center justify-start lg:order-none lg:justify-end">
              {aside ? (
                aside
              ) : logoUrl ? (
                <div className="w-full max-w-[280px] overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.9)] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={imageAlt || title}
                    className="aspect-[4/3] w-full rounded-[18px] object-contain bg-[rgba(248,243,236,0.92)] p-5"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
