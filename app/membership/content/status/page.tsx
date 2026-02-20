import Link from "next/link";

export const metadata = {
  title: "内容审核状态 | 中华整木网 · 会员",
  description: "查看草稿、审核中、已发布内容状态",
};

export default function MembershipContentStatusPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/membership" className="text-sm text-muted hover:text-accent">会员系统</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">内容审核状态</span>
      </nav>
      <h1 className="font-serif text-2xl font-bold text-primary mb-4">内容审核状态</h1>
      <p className="text-muted mb-6">
        草稿 / 审核中 / 已发布列表与筛选功能建设中，敬请期待。
      </p>
      <Link href="/membership" className="text-sm text-accent hover:underline">返回会员首页</Link>
    </div>
  );
}
