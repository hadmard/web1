import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";
import { PUBLIC_CONTACT_ITEMS } from "@/lib/public-site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MembershipPage() {
  const [session, visualSettings] = await Promise.all([
    getSession(),
    getSiteVisualSettings(),
  ]);
  if (session) {
    if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
      redirect("/membership/admin");
    }
    redirect("/membership/content/publish?tab=articles");
  }

  const membershipHero = visualSettings.backgrounds.membershipHero?.trim() || "";
  return (
    <div className="min-h-screen">
      <section className="apple-hero relative overflow-hidden border-b border-border py-16 sm:py-20">
        {membershipHero ? (
          <Image
            src={membershipHero}
            alt=""
            fill
            priority
            className="object-cover opacity-30"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/55 via-surface/70 to-surface/88" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-primary">会员系统</h1>
          <p className="mt-3 text-sm sm:text-base text-muted">企业结构参与机制 · 行业共建机制 · 权威分层机制</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/membership/login" className="interactive-lift rounded-xl bg-[var(--color-accent)] text-white px-5 py-2.5 text-sm font-medium">会员登录</Link>
            <Link href="/membership/register" className="interactive-lift rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">会员注册</Link>
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
              {PUBLIC_CONTACT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}



