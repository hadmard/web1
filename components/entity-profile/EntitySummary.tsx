import type { ReactNode } from "react";

export function EntitySummary({
  eyebrow,
  title,
  statement,
  summary,
  blocks = [],
  aside,
  detailTitle = "展开完整介绍",
  detailContent,
}: {
  eyebrow?: string;
  title: string;
  statement: string;
  summary?: string | null;
  blocks?: string[];
  aside?: ReactNode;
  detailTitle?: string;
  detailContent?: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[rgba(180,154,107,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,241,233,0.9))] p-5 shadow-[0_20px_42px_rgba(35,26,18,0.05)] sm:rounded-[36px] sm:p-8 lg:p-10">
      <div className={`grid gap-5 sm:gap-6 ${aside ? "lg:grid-cols-[minmax(0,1.08fr),minmax(280px,0.92fr)]" : ""}`}>
        <div className="rounded-[24px] border border-[rgba(140,111,78,0.1)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(35,26,18,0.04)] sm:rounded-[30px] sm:p-7">
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7a46]">{eyebrow}</p> : null}
          <h2 className="mt-3 font-serif text-3xl text-[#241c15] sm:text-4xl">{title}</h2>
          <p className="mt-5 text-xl leading-9 text-[#2f261f] sm:text-2xl sm:leading-10">{statement}</p>
          {summary ? <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6a5949]">{summary}</p> : null}
          {blocks.length > 0 ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {blocks.slice(0, 2).map((item, index) => (
                <div key={`${index}-${item}`} className="rounded-[20px] border border-[rgba(140,111,78,0.1)] bg-[rgba(255,251,245,0.9)] p-4 sm:rounded-[24px] sm:p-5">
                  <p className="text-sm leading-7 text-[#4f4134]">{item}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? <div className="space-y-4 self-start">{aside}</div> : null}
      </div>

      {detailContent ? (
        <details className="group mt-5 rounded-[24px] border border-[rgba(140,111,78,0.1)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(35,26,18,0.04)] sm:mt-6 sm:rounded-[30px] sm:p-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7a46]">Detail</p>
              <h3 className="mt-3 font-serif text-2xl text-[#241c15] sm:text-3xl">{detailTitle}</h3>
            </div>
            <span className="rounded-full border border-[rgba(180,154,107,0.18)] bg-[rgba(255,249,240,0.92)] px-4 py-2 text-sm font-medium text-[#9f7a46] transition group-open:bg-white">
              查看详情
            </span>
          </summary>
          <div className="mt-6 border-t border-[rgba(140,111,78,0.08)] pt-6">{detailContent}</div>
        </details>
      ) : null}
    </section>
  );
}
