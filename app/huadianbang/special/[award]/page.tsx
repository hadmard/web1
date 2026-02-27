import { redirect } from "next/navigation";

type Props = { params: Promise<{ award: string }> };

export default async function LegacyHuadianSpecialDetailPage({ params }: Props) {
  const { award } = await params;
  redirect(`/huadianbang/feature/${award}`);
}

