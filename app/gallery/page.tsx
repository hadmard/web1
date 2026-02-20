import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getTermsBySlugs } from "@/lib/terms";

export default async function GalleryPage() {
  const category = await getCategoryWithMetaByHref("/gallery");
  const relatedTerms = await getTermsBySlugs(category?.relatedTermSlugs ?? []);
  return <CategoryHome basePath="/gallery" category={category} relatedTerms={relatedTerms} />;
}
