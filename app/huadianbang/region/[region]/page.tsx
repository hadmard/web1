import { redirect } from "next/navigation";
import { getLatestHuadianYear } from "@/lib/huadianbang";

export default function LegacyHuadianRegionPage() {
  redirect(`/huadianbang/${getLatestHuadianYear()}`);
}

