import { redirect } from "next/navigation";

export const revalidate = 300;

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function LegacyMarketSubPage({ params }: Props) {
  const { subSlug } = await params;
  const target = subSlug?.length ? `/brands/${subSlug.join("/")}` : "/brands";
  redirect(target);
}

