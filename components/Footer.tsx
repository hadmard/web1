import Link from "next/link";

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
    <footer className="mt-16 sm:mt-20 px-3 sm:px-5 pb-6 sm:pb-8">
      <div className="glass-card max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          <div>
            <ul className="space-y-2.5">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-primary/85 hover:text-accent transition-colors">
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
                  <Link href={href} className="text-sm text-primary/85 hover:text-accent transition-colors">
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
                  <Link href={href} className="text-sm text-primary/85 hover:text-accent transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-muted leading-relaxed">整木行业知识基础设施，连接资讯、品牌、标准与会员共建。</p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-primary/85">整木网</p>
          <p className="text-xs text-muted">© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
