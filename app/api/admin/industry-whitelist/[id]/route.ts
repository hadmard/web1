import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const synonyms =
    Array.isArray(body.synonyms)
      ? body.synonyms.map((item: unknown) => String(item).trim()).filter(Boolean)
      : undefined;

  const item = await prisma.industryWhitelist.update({
    where: { id },
    data: {
      word: typeof body.word === "string" ? body.word.trim() || undefined : undefined,
      category: typeof body.category === "string" ? body.category.trim() || undefined : undefined,
      subCategory: typeof body.subCategory === "string" ? body.subCategory.trim() || null : undefined,
      weight: body.weight != null ? Math.max(1, Math.min(3, Number(body.weight) || 1)) : undefined,
      synonyms: synonyms ? (synonyms.length > 0 ? JSON.stringify(synonyms) : null) : undefined,
      status: typeof body.status === "boolean" ? body.status : undefined,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.industryWhitelist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
