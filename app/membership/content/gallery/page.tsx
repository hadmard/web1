import Link from "next/link";

export const metadata = {
  title: "图片管理 | 中华整木网 · 会员",
  description: "分类创建、批量上传、同步图库",
};

export default function MembershipContentGalleryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <Link href="/membership" className="text-sm text-muted hover:text-accent">会员系统</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">图片管理</span>
      </nav>
      <h1 className="font-serif text-2xl font-bold text-primary mb-4">图片管理</h1>
      <p className="text-muted mb-6">
        分类创建、批量上传与同步图库功能建设中，敬请期待。
      </p>
      <Link href="/membership" className="text-sm text-accent hover:underline">返回会员首页</Link>
    </div>
  );
}
