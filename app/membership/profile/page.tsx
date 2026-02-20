import Link from "next/link";

export const metadata = {
  title: "企业资料管理 | 中华整木网 · 会员",
  description: "管理企业介绍、联系方式、地图与资质信息",
};

export default function MembershipProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/membership" className="text-sm text-muted hover:text-accent">会员系统</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">企业资料管理</span>
      </nav>
      <h1 className="font-serif text-2xl font-bold text-primary mb-4">企业资料管理</h1>
      <p className="text-muted mb-6">
        企业介绍、联系方式、地图与资质信息管理功能建设中，敬请期待。
      </p>
      <Link href="/membership" className="text-sm text-accent hover:underline">返回会员首页</Link>
    </div>
  );
}
