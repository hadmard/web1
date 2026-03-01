import { redirect } from "next/navigation";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export default async function LegacyMarketIdPage({ params }: Props) {
  const { id } = await params;
  redirect(`/brands/${id}`);
}

