import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";

export default async function AwardsPage() {
  const category = await getCategoryWithMetaByHref("/awards");
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return <CategoryHome basePath="/awards" category={category} relatedTerms={relatedTerms} />;
}
