import { redirect } from "next/navigation";

type Props = { params: Promise<{ year: string; brand: string }> };

export default async function LegacyHuadianTop10BrandPage({ params }: Props) {
  const { year, brand } = await params;
  redirect(`/huadianbang/${year}/${brand}`);
}

