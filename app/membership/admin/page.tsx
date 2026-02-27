"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/membership/admin/content?mode=publish&tab=articles");
  }, [router]);

  return <div className="min-h-[40vh] flex items-center justify-center text-muted">跳转中...</div>;
}
