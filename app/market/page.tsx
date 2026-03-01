import { redirect } from "next/navigation";

// 兼容旧链接：将 /market 重定向到当前主栏目 /brands（整木市场）
export default function MarketPage() {
  redirect("/brands");
}
