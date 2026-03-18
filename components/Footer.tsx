import Link from "next/link";

const quickActionLinks = [
  { href: "/news", label: "资讯速览", desc: "查看最新行业动态" },
  { href: "/brands/all", label: "市场总览", desc: "按区域和关键词筛选" },
  { href: "/dictionary/all", label: "词库检索", desc: "快速查术语与定义" },
  { href: "/standards/all", label: "标准库", desc: "查看标准与版本信息" },
];

const exploreLinks = [
  { href: "/news", label: "整木资讯" },
  { href: "/brands", label: "整木市场" },
  { href: "/awards", label: "整木评选" },
];

const knowledgeLinks = [
  { href: "/dictionary", label: "整木词库" },
  { href: "/standards", label: "整木标准" },
];

const resourcesLinks = [{ href: "/membership", label: "会员系统" }];

export function Footer() {
  return (
    <footer className="mt-9 px-3 pb-6 sm:mt-20 sm:px-5 sm:pb-8">
      <div className="glass-card mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <section className="rounded-2xl border border-border bg-surface-elevated/80 p-3.5 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-primary">常用入口</p>
            <Link href="/membership" className="text-xs text-accent hover:underline">
              进入会员系统
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickActionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="interactive-lift block rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-accent/45 sm:py-3"
              >
                <p className="text-sm font-medium text-primary">{item.label}</p>
                <p className="mt-1 text-xs text-muted">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-5 sm:mt-6 sm:grid-cols-4 sm:gap-8">
          <div>
            <ul className="space-y-2.5">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary/85 transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ul className="space-y-2.5">
              {knowledgeLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary/85 transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ul className="space-y-2.5">
              {resourcesLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary/85 transition-colors hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm leading-relaxed text-muted">
              整木行业知识基础设施，连接资讯、品牌、标准与会员共建。
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5 text-center sm:mt-10 sm:grid sm:grid-cols-3 sm:items-center sm:pt-6">
          <p className="text-sm text-primary/85 sm:text-left">整木网</p>
          <p className="text-xs text-muted">
            工信部ICP备案：
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="ml-1 transition-colors hover:text-accent"
            >
              浙ICP备2021004169号-1
            </a>
          </p>
          <p className="text-xs text-muted sm:text-right">© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
