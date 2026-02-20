import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.term.findMany({
        select: { id: true, title: true, slug: true, definition: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.term.count(),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
