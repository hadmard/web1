import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

function isAdmin(session: { role: string | null; sub?: string; email?: string } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const record = await prisma.pendingBrand.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "未找到待审核品牌" }, { status: 404 });
  }

  if (body.action === "approve") {
    const word = typeof body.word === "string" ? body.word.trim() || record.brandName : record.brandName;
    const category = typeof body.category === "string" ? body.category.trim() || "品牌" : "品牌";
    const weight = Math.max(1, Math.min(3, Number(body.weight) || 1));

    await prisma.$transaction([
      prisma.industryWhitelist.upsert({
        where: { word },
        update: {
          category,
          weight,
          status: true,
        },
        create: {
          word,
          category,
          weight,
          status: true,
        },
      }),
      prisma.pendingBrand.update({
        where: { id },
        data: {
          status: 1,
          approvedSource: "manual-admin",
          triggerReason: "manual-admin",
        },
      }),
    ]);

    await writeOperationLog({
      actorId: session?.sub,
      actorEmail: session?.email,
      action: "pending_brand_manual_approved",
      targetType: "pending_brand",
      targetId: id,
      detail: JSON.stringify({
        brandName: record.brandName,
        word,
        category,
        weight,
        previousStatus: record.status,
      }),
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "ignore") {
    const item = await prisma.pendingBrand.update({
      where: { id },
      data: { status: 2 },
    });

    await writeOperationLog({
      actorId: session?.sub,
      actorEmail: session?.email,
      action: "pending_brand_ignored",
      targetType: "pending_brand",
      targetId: id,
      detail: JSON.stringify({
        brandName: record.brandName,
        previousStatus: record.status,
      }),
    });

    return NextResponse.json(item);
  }

  const item = await prisma.pendingBrand.update({
    where: { id },
    data: {
      status: body.status != null ? Number(body.status) : undefined,
      sourceContext: typeof body.sourceContext === "string" ? body.sourceContext.trim() || null : undefined,
    },
  });

  await writeOperationLog({
    actorId: session?.sub,
    actorEmail: session?.email,
    action: "pending_brand_updated",
    targetType: "pending_brand",
    targetId: id,
    detail: JSON.stringify({
      brandName: record.brandName,
      previousStatus: record.status,
      nextStatus: item.status,
    }),
  });

  return NextResponse.json(item);
}
