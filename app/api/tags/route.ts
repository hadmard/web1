import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TAG_TYPES = [
  { key: "industry", label: "行业标签" },
  { key: "tech", label: "技术标签" },
  { key: "style", label: "风格标签" },
  { key: "region", label: "区域标签" },
  { key: "level", label: "等级标签" },
] as const;

/** 公开：按类型列出标签，用于标签入口与标签页 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  try {
    if (type && TAG_TYPES.some((t) => t.key === type)) {
      const tags = await prisma.tag.findMany({
        where: { type },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { slug: true, label: true, type: true },
      });
      return NextResponse.json({ type, tags });
    }
    const all = await prisma.tag.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
      select: { type: true, slug: true, label: true },
    });
    const byType = TAG_TYPES.map((t) => ({
      ...t,
      tags: all.filter((tag) => tag.type === t.key),
    }));
    return NextResponse.json({ types: byType });
  } catch (e) {
    console.error("GET /api/tags", e);
    return NextResponse.json({ types: TAG_TYPES.map((t) => ({ ...t, tags: [] })) });
  }
}
