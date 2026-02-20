import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";

export default async function DictionaryPage() {
  const category = await getCategoryWithMetaByHref("/dictionary");
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return <CategoryHome basePath="/dictionary" category={category} relatedTerms={relatedTerms} />;
}
