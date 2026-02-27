import { redirect } from "next/navigation";

type Props = { params: Promise<{ year: string }> };

export default async function LegacyHuadianTop10Page({ params }: Props) {
  const { year } = await params;
  redirect(`/huadianbang/${year}`);
}

