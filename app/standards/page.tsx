import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";

export default async function StandardsPage() {
  const category = await getCategoryWithMetaByHref("/standards");
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return <CategoryHome basePath="/standards" category={category} relatedTerms={relatedTerms} />;
}
