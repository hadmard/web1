import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  return NextResponse.json({
    message: "该功能已停用。当前系统只保留文章关键词自动识别，不再维护待审核品牌。",
    items: [],
    metrics: {
      pendingEnterCount: 0,
      autoApprovedCount: 0,
      manualApprovedCount: 0,
      ignoredCount: 0,
      highFrequencyPending: [],
    },
  });
}
