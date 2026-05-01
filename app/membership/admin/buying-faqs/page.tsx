"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminBuyingFaqsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/membership/admin/content?mode=manage&tab=buying");
  }, [router]);

  return (
    <div className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Buying Content</p>
      <h1 className="mt-3 font-serif text-3xl text-primary">整木选购问答已停用</h1>
      <div className="mt-5">
        <Link
          href="/membership/admin/content?mode=manage&tab=buying"
          className="inline-flex items-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          前往整木选购内容管理
        </Link>
      </div>
    </div>
  );
}
