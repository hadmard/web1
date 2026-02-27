import { redirect } from "next/navigation";

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function DataSubPage({ params }: Props) {
  await params;
  redirect("/");
}
