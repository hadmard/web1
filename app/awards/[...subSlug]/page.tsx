import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function AwardsSubPage({ params }: Props) {
  const { subSlug } = await params;
  const href = "/awards/" + (subSlug?.join("/") ?? "");
  const categories = await getCategories();
  const awardsCat = categories.find((c) => c.href === "/awards");
  const sub = awardsCat?.subcategories.find((s) => s.href === href);
  if (!sub) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/awards" className="text-sm text-muted hover:text-accent">整木评选</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">{sub.label}</span>
      </nav>
      <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">
        {sub.label}
      </h1>
      <p className="mt-2 text-muted">本栏目评选与榜单后续接入。</p>
    </div>
  );
}
