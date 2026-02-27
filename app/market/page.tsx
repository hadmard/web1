import { redirect } from "next/navigation";

// 兼容旧链接：将 /market 重定向到新的整木品牌栏目 /brands
export default function MarketPage() {
  redirect("/brands");
}
