import { permanentRedirect } from "next/navigation";
import { YOUXUAN_H5_URL } from "@/lib/youxuan";

export default function YouxuanPage() {
  permanentRedirect(YOUXUAN_H5_URL);
}
