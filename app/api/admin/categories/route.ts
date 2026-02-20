import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** 主账号：获取全部大类与小类（含 id，用于后台编辑） */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const list = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
  return NextResponse.json(list);
}
