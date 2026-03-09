import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  "会员系统",
  "会员系统、登录、资料维护与后台管理页面不参与搜索引擎收录。"
);

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
