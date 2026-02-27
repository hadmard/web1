import { redirect } from "next/navigation";

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function StandardsSubPage({ params }: Props) {
  const { subSlug } = await params;
  const href = "/standards/" + (subSlug?.join("/") ?? "");
  redirect(`/standards/all?sub=${encodeURIComponent(href)}`);
}
