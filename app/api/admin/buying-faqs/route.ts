import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function parseInteger(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function revalidateBuyingPaths() {
  revalidatePath("/brands");
  revalidatePath("/brands/buying");
  revalidatePath("/brands/faq");
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const items = await prisma.buyingFaq.findMany({
    orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (!answer) {
    return NextResponse.json({ error: "答案不能为空" }, { status: 400 });
  }

  const item = await prisma.buyingFaq.create({
    data: {
      question,
      answer,
      sort: parseInteger(body.sort, 0),
      visible: parseBoolean(body.visible, true),
    },
  });

  revalidateBuyingPaths();
  return NextResponse.json(item);
}
