import Link from "next/link";

export function HomeJoinSection() {
  return (
    <section className="section-tone-a py-11 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div data-reveal="fade-up" className="glass-panel spotlight-card p-5 text-center sm:p-8" data-mouse-zone>
          <h3 className="font-serif text-[1.48rem] font-semibold leading-none tracking-[-0.02em] text-primary whitespace-nowrap sm:text-3xl">
            加入整木网，进入行业结构
          </h3>
          <p className="mt-3 text-[13px] leading-7 text-muted sm:text-sm">
            会员系统不仅是发布入口，也是标准共建、内容协作与行业知识沉淀的工作空间。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-1.5 sm:mt-6 sm:gap-3">
            <Link href="/membership" className="interactive-lift inline-flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[var(--color-accent)] px-2 py-2.5 text-[12px] font-medium leading-none text-white sm:min-w-[9.25rem] sm:flex-none sm:px-5 sm:text-sm">
              企业入驻
            </Link>
            <Link href="/membership" className="interactive-lift inline-flex min-w-0 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-2 py-2.5 text-[12px] font-medium leading-none text-primary sm:min-w-[9.25rem] sm:flex-none sm:px-5 sm:text-sm">
              个人入驻
            </Link>
            <Link href="/standards/co-create" className="interactive-lift inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px] font-medium leading-none text-primary sm:min-w-[9.25rem] sm:w-auto sm:px-5 sm:text-sm">
              参与标准共建
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
