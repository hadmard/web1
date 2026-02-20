"use client";

export function ScrollHint() {
  return (
    <div className="scroll-hint flex flex-col items-center justify-center pb-8">
      <span className="text-xs font-medium uppercase tracking-widest text-muted">scroll</span>
      <span className="scroll-hint-arrow mt-2 block h-5 w-5 border-r-2 border-b-2 border-muted" />
    </div>
  );
}
