import Link from "next/link";

export function HomeJoinSection() {
  return (
    <section className="section-tone-a py-14 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div data-reveal="fade-up" className="glass-panel spotlight-card p-7 sm:p-8 text-center" data-mouse-zone>
          <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">加入整木网，进入行业结构</h3>
          <p className="mt-3 text-sm text-muted">会员系统不仅是发布入口，更是标准共建、内容协作与行业知识沉淀的工作空间。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            <Link href="/membership" className="interactive-lift inline-flex min-w-[9.25rem] items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white">企业入驻</Link>
            <Link href="/membership" className="interactive-lift inline-flex min-w-[9.25rem] items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">个人入驻</Link>
            <Link href="/standards/co-create" className="interactive-lift inline-flex min-w-[9.25rem] items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">参与标准共建</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
