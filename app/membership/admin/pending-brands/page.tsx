"use client";

export default function PendingBrandsAdminPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(247,242,234,0.94))] px-6 py-8 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
        <h1 className="text-2xl font-semibold text-primary">待审核品牌已停用</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          该功能已停用。当前系统只保留文章关键词自动识别，不再维护待审核品牌。
        </p>
      </div>
    </div>
  );
}
