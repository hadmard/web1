import { StructuredSearch } from "@/components/StructuredSearch";

export const revalidate = 300;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <section className="border-b border-border py-14 sm:py-20">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <h1 className="font-serif text-4xl font-semibold tracking-[0.08em] text-primary sm:text-6xl">整木网</h1>
            <p className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-[12px] text-muted sm:text-sm">
              整体木作行业知识共享平台
            </p>
          </div>
          <div className="mt-7 w-full">
            <StructuredSearch hero />
          </div>
        </div>
      </section>
    </main>
  );
}
