import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { getBrandDirectoryBySlug } from "@/lib/brand-directory";

export const revalidate = 300;

type Props = {
  params: Promise<{ subSlug: string[] }>;
};

type MarketFaq = {
  id: string;
  question: string;
  answer: string;
};

const MARKET_TITLE = "整木市场";
const LEGACY_MARKET_TITLE = "整木品牌";
const MARKET_FALLBACK_DESC = "整木市场栏目，覆盖品牌内容与整木选购 FAQ。";
const MARKET_FAQ_FALLBACK: MarketFaq[] = [
  {
    id: "faq-1",
    question: "整木选购应该先看什么？",
    answer: "先明确预算、空间风格和交付周期，再对比品牌的材料体系、工艺标准和售后能力。",
  },
  {
    id: "faq-2",
    question: "如何判断品牌是否适合本地交付？",
    answer: "建议优先查看服务区域、安装团队配置和本地案例，确认量尺、生产、安装各环节响应时间。",
  },
  {
    id: "faq-3",
    question: "选购阶段最容易忽略哪些问题？",
    answer: "常见遗漏包括合同交付范围、增项规则、安装验收标准和售后质保条款，建议在下单前逐条确认。",
  },
];

function normalizeMarketTitle(input?: string | null) {
  const value = input?.trim();
  if (!value || value === LEGACY_MARKET_TITLE) return MARKET_TITLE;
  return value;
}

function normalizeSegment(raw: string) {
  let value = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim();
}

async function findBrandBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return getBrandDirectoryBySlug(s);
}

async function getMarketFaqState() {
  const category = await prisma.category.findFirst({
    where: { href: "/brands" },
    include: {
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });

  const title = normalizeMarketTitle(category?.title);
  const desc = category?.desc?.trim() || MARKET_FALLBACK_DESC;
  const faqs =
    category?.faqs
      .filter((item) => item.question.trim() && item.answer.trim())
      .map((item) => ({ id: item.id, question: item.question.trim(), answer: item.answer.trim() })) ?? [];

  return {
    title,
    desc,
    faqs: faqs.length > 0 ? faqs : MARKET_FAQ_FALLBACK,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) return { title: MARKET_TITLE };

  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") return { title: `${MARKET_TITLE}总览` };

  if (segment === "brand") {
    return buildPageMetadata({
      title: `整木品牌 | 中华整木网 · ${MARKET_TITLE}`,
      description: "整木品牌子栏目，支持品牌浏览与对比。",
      path: "/brands/all",
    });
  }

  if (segment === "buying" || segment === "faq") {
    const faqState = await getMarketFaqState();
    return buildPageMetadata({
      title: `整木选购 FAQ | 中华整木网 · ${faqState.title}`,
      description: faqState.desc,
      path: "/brands/faq",
    });
  }

  const brand = await findBrandBySegment(segment);
  if (!brand) return { title: "品牌内容" };
  const description = brand.summary;
  return buildPageMetadata({
    title: `${brand.enterpriseName} | 中华整木网 · ${MARKET_TITLE}`,
    description,
    path: `/brands/${brand.slug}`,
  });
}

export default async function BrandDetailPage({ params }: Props) {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) notFound();

  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") {
    redirect("/brands/all");
  }

  if (segment === "brand") {
    redirect("/brands/all");
  }

  if (segment === "buying" || segment === "faq") {
    const faqState = await getMarketFaqState();
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-accent">{faqState.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">整木选购</span>
        </nav>

        <section className="glass-panel p-6 sm:p-7">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">整木选购 FAQ</h1>
          <p className="mt-2 text-sm text-muted">{faqState.desc}</p>

          <div className="mt-6 space-y-3">
            {faqState.faqs.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-border bg-surface-elevated p-4">
                <h2 className="text-base font-semibold text-primary">Q{index + 1}：{item.question}</h2>
                <p className="mt-2 text-sm text-muted leading-7">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <Link href="/brands/all" className="apple-inline-link">查看整木市场总览</Link>
          </div>
        </section>
      </div>
    );
  }

  const brand = await findBrandBySegment(segment);
  if (!brand) notFound();
  if (brand.enterprise) {
    redirect(`/enterprise/${brand.enterprise.id}`);
  }
  notFound();
}

