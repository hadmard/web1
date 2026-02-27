import { redirect } from "next/navigation";

export default function MembershipContentGalleryPage() {
  redirect("/membership/content/publish?tab=articles");
}
