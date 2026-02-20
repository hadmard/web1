import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";

export default async function DataPage() {
  const category = await getCategoryWithMetaByHref("/data");
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return <CategoryHome basePath="/data" category={category} relatedTerms={relatedTerms} />;
}
