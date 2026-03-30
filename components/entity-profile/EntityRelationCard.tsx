import type { ReactNode } from "react";

type RelationItem = {
  label: string;
  value: string;
  href?: string | null;
};

export function EntityRelationCard({
  eyebrow,
  title,
  description,
  items,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  items: RelationItem[];
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[rgba(140,111,78,0.1)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(35,26,18,0.04)] sm:rounded-[30px] sm:p-7">
      {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7a46]">{eyebrow}</p> : null}
      <h3 className="mt-3 font-serif text-3xl text-[#241c15]">{title}</h3>
      {description ? <p className="mt-4 text-sm leading-7 text-[#6a5949]">{description}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-[rgba(140,111,78,0.1)] bg-[rgba(255,251,245,0.9)] px-4 py-4 sm:rounded-[22px]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9f7a46]">{item.label}</p>
            {item.href ? (
              <a
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                className="mt-2 block text-sm leading-7 text-[#342a22] underline-offset-4 hover:text-[#a47b45] hover:underline"
              >
                {item.value}
              </a>
            ) : (
              <p className="mt-2 text-sm leading-7 text-[#342a22]">{item.value}</p>
            )}
          </div>
        ))}
      </div>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
