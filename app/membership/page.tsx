import Link from "next/link";
import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";
import { getSession } from "@/lib/session";

export default async function MembershipPage() {
  const [category, session] = await Promise.all([
    getCategoryWithMetaByHref("/membership"),
    getSession(),
  ]);
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return (
    <CategoryHome basePath="/membership" category={category} relatedTerms={relatedTerms}>
      {session?.role === "SUPER_ADMIN" && (
        <Link
          href="/membership/admin"
          className="inline-flex items-center rounded-xl border border-accent/50 bg-surface-elevated px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          主账号后台
        </Link>
      )}
    </CategoryHome>
  );
}
