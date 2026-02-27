import { redirect } from "next/navigation";

export default function MemberContentPage() {
  redirect("/membership/content/publish?tab=articles");
}

