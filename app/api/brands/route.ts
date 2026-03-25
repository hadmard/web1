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
      prisma.brand.findMany({
        where: { isBrandVisible: true },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          tagline: true,
          region: true,
          area: true,
          positioning: true,
          isRecommend: true,
          sortOrder: true,
          rankingWeight: true,
          displayTemplate: true,
          updatedAt: true,
          enterprise: {
            select: {
              id: true,
              companyName: true,
              companyShortName: true,
            },
          },
        },
        orderBy: [{ isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.brand.count({ where: { isBrandVisible: true } }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
