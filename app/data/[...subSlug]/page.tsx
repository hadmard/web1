import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function DataSubPage({ params }: Props) {
  const { subSlug } = await params;
  const href = "/data/" + (subSlug?.join("/") ?? "");
  const categories = await getCategories();
  const dataCat = categories.find((c) => c.href === "/data");
  const sub = dataCat?.subcategories.find((s) => s.href === href);
  if (!sub) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/data" className="text-sm text-muted hover:text-accent">整木数据</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">{sub.label}</span>
      </nav>
      <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">
        {sub.label}
      </h1>
      <p className="mt-2 text-muted">本栏目数据与报告后续接入。</p>
    </div>
  );
}
