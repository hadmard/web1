import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const year = searchParams.get("year");
    const skip = (page - 1) * limit;

    const where = year ? { year: parseInt(year, 10) } : {};

    const [items, total] = await Promise.all([
      prisma.industryData.findMany({
        where,
        select: { id: true, title: true, source: true, year: true, updatedAt: true },
        orderBy: { year: "desc" },
        skip,
        take: limit,
      }),
      prisma.industryData.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
