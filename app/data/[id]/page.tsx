import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function IndustryDataPage({ params }: Props) {
  await params;
  redirect("/");
}
