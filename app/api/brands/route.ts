import { NextRequest, NextResponse } from "next/server";
import { getBrandDirectory } from "@/lib/brand-directory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
    const q = searchParams.get("q")?.trim() ?? "";
    const region = searchParams.get("region")?.trim() ?? "";

    const result = await getBrandDirectory({ page, pageSize: limit, q, region });

    return NextResponse.json({
      items: result.items,
      recommended: result.recommended,
      total: result.total,
      totalPages: result.totalPages,
      page: result.page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/brands", error);
    return NextResponse.json({ error: "品牌数据加载失败" }, { status: 500 });
  }
}
