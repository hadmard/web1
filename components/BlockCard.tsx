import Link from "next/link";

/** 统一尺寸的内容卡片：数据库风格、无渐变 */
type BlockCardProps = {
  title: string;
  description?: string;
  href: string;
  meta?: string;
  children?: React.ReactNode;
};

export function BlockCard({ title, description, href, meta, children }: BlockCardProps) {
  return (
    <Link
      href={href}
      className="interactive-lift gpu-layer glass-panel block h-full p-5 rounded-[var(--radius-md)] hover:border-accent/35 transition-colors duration-200"
    >
      <h3 className="font-serif font-semibold text-primary text-[15px] leading-tight">
        {title}
      </h3>
      {meta && (
        <p className="mt-1 text-xs text-muted">{meta}</p>
      )}
      {description && (
        <p className="mt-2 text-sm text-muted font-normal line-clamp-2">{description}</p>
      )}
      {children}
    </Link>
  );
}
