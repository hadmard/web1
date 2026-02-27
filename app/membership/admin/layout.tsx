import { Suspense } from "react";
import AdminLayoutClient from "./layout-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-muted">加载中...</div>}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}
