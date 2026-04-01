import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = {};
  if (status != null && status !== "") where.status = Number(status);
  if (q) {
    where.OR = [
      { brandName: { contains: q, mode: "insensitive" } },
      { sourceContext: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.pendingBrand.findMany({
    where,
    orderBy: [{ occurrenceCount: "desc" }, { lastOccurrence: "desc" }],
  });

  const [
    pendingEnterCount,
    autoApprovedCount,
    manualApprovedCount,
    ignoredCount,
    highFrequencyPending,
  ] = await Promise.all([
    prisma.operationLog.count({ where: { action: { in: ["news_pending_brand_created", "news_pending_brand_seen"] } } }),
    prisma.operationLog.count({ where: { action: "news_pending_brand_auto_approved" } }),
    prisma.operationLog.count({ where: { action: "pending_brand_manual_approved" } }),
    prisma.operationLog.count({ where: { action: "pending_brand_ignored" } }),
    prisma.pendingBrand.findMany({
      where: { status: 0 },
      orderBy: [{ occurrenceCount: "desc" }, { articleCount: "desc" }, { lastOccurrence: "desc" }],
      take: 10,
      select: {
        id: true,
        brandName: true,
        occurrenceCount: true,
        articleCount: true,
        confidence: true,
        lastOccurrence: true,
      },
    }),
  ]);

  return NextResponse.json({
    items,
    metrics: {
      pendingEnterCount,
      autoApprovedCount,
      manualApprovedCount,
      ignoredCount,
      highFrequencyPending,
    },
  });
}
