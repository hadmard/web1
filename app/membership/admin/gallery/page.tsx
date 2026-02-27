import { redirect } from "next/navigation";

export default function AdminGalleryPage() {
  redirect("/membership/admin/content?mode=publish&tab=articles");
}
