import { redirect } from "next/navigation";

export default function MembershipVerificationPage() {
  redirect("/membership/content#verification-form");
}
