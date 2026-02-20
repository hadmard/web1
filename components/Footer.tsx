import Link from "next/link";

const exploreLinks = [
  { href: "/news", label: "整木资讯" },
  { href: "/market", label: "整木市场" },
  { href: "/awards", label: "整木评选" },
  { href: "/gallery", label: "整木图库" },
];
const knowledgeLinks = [
  { href: "/dictionary", label: "整木词库" },
  { href: "/standards", label: "整木标准" },
  { href: "/data", label: "整木数据" },
];
const resourcesLinks = [
  { href: "/membership", label: "会员系统" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-cool dark:border-border-warm bg-surface-elevated/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-accent mb-4">
              探索
            </h3>
            <ul className="space-y-3">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted hover:text-accent transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-accent-teal mb-4">
              知识
            </h3>
            <ul className="space-y-3">
              {knowledgeLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted hover:text-accent-teal transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-accent mb-4">
              资源
            </h3>
            <ul className="space-y-3">
              {resourcesLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted hover:text-accent transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted">
            中华整木网 · 整木行业知识基础设施
          </p>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} 保留所有权利
          </p>
        </div>
      </div>
    </footer>
  );
}
