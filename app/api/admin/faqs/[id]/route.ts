import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** 主账号：更新 FAQ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const { question, answer, sortOrder } = body;
  const data: { question?: string; answer?: string; sortOrder?: number } = {};
  if (typeof question === "string") data.question = question.trim();
  if (typeof answer === "string") data.answer = answer.trim();
  if (typeof sortOrder === "number") data.sortOrder = sortOrder;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供 question、answer 或 sortOrder" }, { status: 400 });
  }
  try {
    const faq = await prisma.categoryFaq.update({
      where: { id },
      data,
    });
    return NextResponse.json(faq);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** 主账号：删除 FAQ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.categoryFaq.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
