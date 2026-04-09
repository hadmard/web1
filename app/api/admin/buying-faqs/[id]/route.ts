import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function revalidateBuyingPaths() {
  revalidatePath("/brands");
  revalidatePath("/brands/buying");
  revalidatePath("/brands/faq");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, string | number | boolean> = {};

  if (body.question !== undefined) {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    updates.question = question;
  }

  if (body.answer !== undefined) {
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!answer) return NextResponse.json({ error: "答案不能为空" }, { status: 400 });
    updates.answer = answer;
  }

  if (body.sort !== undefined) {
    const sort = parseInteger(body.sort);
    if (sort === undefined) return NextResponse.json({ error: "排序值无效" }, { status: 400 });
    updates.sort = sort;
  }

  if (body.visible !== undefined) {
    const visible = parseBoolean(body.visible);
    if (visible === undefined) return NextResponse.json({ error: "显示状态无效" }, { status: 400 });
    updates.visible = visible;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "请提供要更新的字段" }, { status: 400 });
  }

  const item = await prisma.buyingFaq.update({
    where: { id },
    data: updates,
  });

  revalidateBuyingPaths();
  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.buyingFaq.delete({ where: { id } });
  revalidateBuyingPaths();
  return NextResponse.json({ ok: true });
}
