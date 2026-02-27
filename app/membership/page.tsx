import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MembershipPage() {
  const session = await getSession();
  if (session) {
    if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
      redirect("/membership/admin");
    }
    redirect("/membership/content/publish?tab=articles");
  }

  return (
    <div className="min-h-screen">
      <section className="apple-hero border-b border-border py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-primary">会员系统</h1>
          <p className="mt-3 text-sm sm:text-base text-muted">企业结构参与机制 · 行业共建机制 · 权威分层机制</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/membership/login" className="interactive-lift rounded-xl bg-[var(--color-accent)] text-white px-5 py-2.5 text-sm font-medium">会员登录</Link>
            <Link href="/membership/profile" className="interactive-lift rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">企业资料管理</Link>
            <Link href="/membership/content/verification" className="interactive-lift rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">企业认证申请</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface-elevated py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-4">
          <article className="glass-panel p-5">
            <h2 className="font-serif text-lg font-semibold text-primary">企业基础会员</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>企业基础展示页（介绍、Logo、区域、联系方式）</li>
              <li>可提交资讯与图库内容（默认待审核）</li>
              <li>适合首次入驻企业</li>
            </ul>
          </article>

          <article className="glass-panel p-5">
            <h2 className="font-serif text-lg font-semibold text-primary">个人会员</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>查看完整行业数据与标准内容</li>
              <li>下载报告与标准文件（按系统开关）</li>
              <li>可提交标准建议与草案反馈</li>
            </ul>
          </article>

          <article className="glass-panel p-5">
            <h2 className="font-serif text-lg font-semibold text-primary">企业高级会员</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>增强企业展示：产品体系、工艺等级、认证与获奖</li>
              <li>可参与标准共建与结构化关联</li>
              <li>品牌展示与推荐权重更高</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-4">
          <article className="glass-panel p-5">
            <h2 className="font-serif text-lg font-semibold text-primary">简要权益</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>会员可上传资讯与图库素材，进入审核流程</li>
              <li>会员可提交企业认证资料，审核后自动生成企业详情页</li>
              <li>可在个人中心管理资料、查看审核状态</li>
              <li>满足条件可参与标准共建与行业内容协作</li>
            </ul>
          </article>

          <article className="glass-panel p-5">
            <h2 className="font-serif text-lg font-semibold text-primary">联系方式</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>会员咨询：member@zhengmu.example</li>
              <li>商务合作：service@zhengmu.example</li>
              <li>联系电话：400-000-0000</li>
              <li>工作时间：周一至周五 09:00-18:00</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
