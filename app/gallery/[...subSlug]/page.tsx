import { redirect } from "next/navigation";

type Props = { params: Promise<{ subSlug: string[] }> };

export default async function GallerySubPage({ params }: Props) {
  await params;
  redirect("/");
}
