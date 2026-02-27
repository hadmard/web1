import { redirect } from "next/navigation";

type Props = { params: Promise<{ category: string; slug: string }> };

export default async function LegacyHuadianEngineerDetailPage({ params }: Props) {
  const { category, slug } = await params;
  redirect(`/huadianbang/partner/${category}/${slug}`);
}

