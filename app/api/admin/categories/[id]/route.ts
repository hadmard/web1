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
  const { title, desc, definitionText, versionLabel, versionYear, relatedTermSlugs } = body;
  const data: {
    title?: string;
    desc?: string;
    definitionText?: string | null;
    versionLabel?: string | null;
    versionYear?: number | null;
    relatedTermSlugs?: string | null;
  } = {};
  if (typeof title === "string") data.title = title;
  if (typeof desc === "string") data.desc = desc;
  if (definitionText !== undefined) data.definitionText = definitionText === "" || definitionText == null ? null : String(definitionText);
  if (versionLabel !== undefined) data.versionLabel = versionLabel === "" || versionLabel == null ? null : String(versionLabel);
  if (versionYear !== undefined) data.versionYear = versionYear === "" || versionYear == null ? null : Number(versionYear);
  if (relatedTermSlugs !== undefined) {
    data.relatedTermSlugs = Array.isArray(relatedTermSlugs)
      ? JSON.stringify(relatedTermSlugs)
      : typeof relatedTermSlugs === "string"
        ? relatedTermSlugs.trim() || null
        : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "至少提供一个可编辑字段" }, { status: 400 });
  }
  try {
    const category = await prisma.category.update({
      where: { id },
      data,
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
