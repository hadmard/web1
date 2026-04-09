import type { Metadata } from "next";
import Link from "next/link";
import {
  PUBLIC_BUSINESS_CONTACT_EMAIL,
  PUBLIC_CONTACT_PHONE,
  PUBLIC_MEMBER_CONTACT_EMAIL,
} from "@/lib/public-site-config";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "联系我们",
    description: "获取整木品牌合作、会员咨询与业务联系信息。",
    path: "/contact",
    type: "website",
  });
}

const contactCards = [
  { label: "会员咨询", value: PUBLIC_MEMBER_CONTACT_EMAIL, href: `mailto:${PUBLIC_MEMBER_CONTACT_EMAIL}` },
  { label: "商务合作", value: PUBLIC_BUSINESS_CONTACT_EMAIL, href: `mailto:${PUBLIC_BUSINESS_CONTACT_EMAIL}` },
  { label: "联系电话", value: PUBLIC_CONTACT_PHONE, href: `tel:${PUBLIC_CONTACT_PHONE}` },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <section className="rounded-[34px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] px-6 py-8 shadow-[0_24px_76px_rgba(34,31,26,0.08)] sm:px-8 sm:py-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Contact</p>
        <h1 className="mt-4 font-serif text-3xl text-primary sm:text-[2.8rem]">联系我们</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-muted sm:text-base">
          如果你正在筛选整木品牌、准备咨询合作，或者想进一步沟通平台内容与会员服务，可以通过下面的方式联系。
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {contactCards.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="rounded-[26px] border border-[rgba(15,23,42,0.06)] bg-white/94 px-6 py-6 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.16)] transition hover:-translate-y-1 hover:shadow-[0_24px_52px_-36px_rgba(15,23,42,0.18)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[#9d7e4d]">{item.label}</p>
            <p className="mt-3 break-all text-base leading-7 text-primary">{item.value}</p>
          </a>
        ))}
      </section>

      <div className="mt-8">
        <Link href="/brands?from=buying" className="text-sm text-accent transition hover:opacity-80">
          返回整木选购与品牌筛选
        </Link>
      </div>
    </div>
  );
}
