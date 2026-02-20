import Link from "next/link";

export type NavItem = { href: string; label: string };

export function Header({ navItems }: { navItems: NavItem[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border-warm dark:border-border-cool glass-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link
          href="/"
          className="font-serif font-semibold text-[15px] tracking-tight text-primary hover:opacity-90 transition-opacity duration-200"
        >
          <span className="text-gradient">中华整木网</span>
        </Link>
        <nav className="flex items-center gap-8" aria-label="主导航">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-sans text-sm font-medium text-muted hover:text-accent transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
