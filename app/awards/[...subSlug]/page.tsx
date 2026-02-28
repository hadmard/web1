import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCategories } from "@/lib/categories";
export const revalidate = 300;


type Props = { params: Promise<{ subSlug: string[] }> };

const LEGACY_AWARDS_REDIRECTS: Record<string, string> = {
  "/awards/huadian": "/huadianbang",
  "/awards/rules": "/huadianbang",
  "/awards/top-brands": "/huadianbang/2025",
  "/awards/regional": "/huadianbang/2025",
};

export default async function AwardsSubPage({ params }: Props) {
  const { subSlug } = await params;
  const href = "/awards/" + (subSlug?.join("/") ?? "");

  if (LEGACY_AWARDS_REDIRECTS[href]) {
    redirect(LEGACY_AWARDS_REDIRECTS[href]);
  }

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
      <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">{sub.label}</h1>
      <p className="mt-2 text-muted">该栏目已升级至华点榜 3.0 结构化系统，可从整木评选菜单进入对应页面。</p>
    </div>
  );
}
