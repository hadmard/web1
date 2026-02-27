import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const { label, groupLabel } = body;
  const data: { label?: string; groupLabel?: string | null } = {};
  if (typeof label === "string") data.label = label;
  if (groupLabel !== undefined) data.groupLabel = groupLabel === "" || groupLabel == null ? null : String(groupLabel);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供 label 或 groupLabel" }, { status: 400 });
  }
  try {
    const sub = await prisma.subCategory.update({
      where: { id },
      data,
    });
    return NextResponse.json(sub);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
