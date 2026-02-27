import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.standard.findMany({
        select: { id: true, title: true, code: true, year: true, updatedAt: true },
        orderBy: { year: "desc" },
        skip,
        take: limit,
      }),
      prisma.standard.count(),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
