import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getBuyingFaqs } from "@/lib/buying-faq";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_TITLE = "整木定制选购指南";
const PAGE_DESCRIPTION =
  "从预算、材质、工艺、交付到售后，系统梳理整木定制选购中的关键问题，帮助你更稳地完成品牌筛选与需求沟通。";

type FaqBlock = {
  type: "faq";
  item: Awaited<ReturnType<typeof getBuyingFaqs>>[number];
};

type CtaBlock = {
  type: "cta";
  index: number;
};

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: "/brands/buying",
    type: "website",
  });
}

function interleaveBlocks(items: Awaited<ReturnType<typeof getBuyingFaqs>>) {
  const blocks: Array<FaqBlock | CtaBlock> = [];
  items.forEach((item, index) => {
    blocks.push({ type: "faq", item });
    if ((index + 1) % 4 === 0 && index < items.length - 1) {
      blocks.push({ type: "cta", index });
    }
  });
  return blocks;
}

export default async function BuyingPage() {
  const items = await getBuyingFaqs({ visibleOnly: true });
  const blocks = interleaveBlocks(items);
  const faqSchema =
    items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
          url: absoluteUrl("/brands/buying"),
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      {faqSchema ? <JsonLd data={faqSchema} /> : null}

      <section className="overflow-hidden rounded-[34px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] px-6 py-8 shadow-[0_24px_76px_rgba(34,31,26,0.08)] sm:px-8 sm:py-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Buying Guide</p>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-primary sm:text-[2.9rem] sm:leading-[1.08]">
          {PAGE_TITLE}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-muted sm:text-base">
          {PAGE_DESCRIPTION}
        </p>
      </section>

      <section className="mt-8 space-y-5">
        {blocks.length === 0 ? (
          <article className="rounded-[28px] border border-border bg-white/92 px-6 py-7 text-sm text-muted shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            暂无选购问答内容。
          </article>
        ) : (
          (() => {
            let faqNumber = 0;
            return blocks.map((block) =>
              block.type === "faq" ? (
                (() => {
                  faqNumber += 1;
                  return (
              <article
                key={block.item.id}
                className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.94)] px-6 py-7 shadow-[0_22px_44px_-38px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[#9d7e4d]">Q{faqNumber}</p>
                <h3 className="mt-3 font-serif text-2xl leading-tight text-primary">{block.item.question}</h3>
                <p className="mt-4 text-[15px] leading-8 text-primary/84 sm:text-base">{block.item.answer}</p>
              </article>
                  );
                })()
              ) : (
              <section
                key={`cta-${block.index}`}
                className="rounded-[30px] border border-[rgba(181,157,121,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(244,237,227,0.94))] px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:px-8"
              >
                <p className="text-xs uppercase tracking-[0.26em] text-[#9d7e4d]">Next Step</p>
                <h2 className="mt-3 font-serif text-2xl text-primary">还想继续筛选品牌或直接咨询？</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                  先去看品牌列表做横向比较，或者直接联系我们，把预算、风格和空间需求一次说清楚。
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/brands?from=buying"
                    className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-92"
                  >
                    查看品牌列表
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-primary transition hover:bg-surface"
                  >
                    联系我们
                  </Link>
                </div>
              </section>
              ),
            );
          })()
        )}
      </section>
    </div>
  );
}
