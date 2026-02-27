import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ q?: string; category?: string; tag?: string; sort?: string; page?: string }>;
};

export default async function GalleryAllPage({ searchParams }: Props) {
  await searchParams;
  redirect("/");
}
