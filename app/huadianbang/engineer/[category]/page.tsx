import { redirect } from "next/navigation";

type Props = { params: Promise<{ category: string }> };

export default async function LegacyHuadianEngineerCategoryPage({ params }: Props) {
  const { category } = await params;
  redirect(`/huadianbang/partner/${category}`);
}

