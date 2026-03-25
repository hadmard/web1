import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];
  const patch = typeof body.patch === "object" && body.patch ? body.patch as Record<string, unknown> : {};

  if (ids.length === 0) {
    return NextResponse.json({ error: "请选择要批量处理的品牌" }, { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (typeof patch.isBrandVisible === "boolean") data.isBrandVisible = patch.isBrandVisible;
  if (typeof patch.isRecommend === "boolean") data.isRecommend = patch.isRecommend;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供有效的批量操作内容" }, { status: 400 });
  }

  const brands = await prisma.brand.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      enterpriseId: true,
    },
  });

  await prisma.brand.updateMany({
    where: { id: { in: ids } },
    data,
  });

  revalidatePath("/brands");
  revalidatePath("/brands/all");
  for (const brand of brands) {
    if (brand.slug) revalidatePath(`/brands/${brand.slug}`);
    if (brand.enterpriseId) revalidatePath(`/enterprise/${brand.enterpriseId}`);
  }

  return NextResponse.json({
    ok: true,
    count: brands.length,
    patch: data,
  });
}
