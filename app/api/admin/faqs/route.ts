import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** 主账号：新增栏目 FAQ */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const body = await request.json();
  const { categoryId, question, answer, sortOrder } = body;
  if (typeof categoryId !== "string" || typeof question !== "string" || typeof answer !== "string") {
    return NextResponse.json({ error: "请提供 categoryId、question、answer" }, { status: 400 });
  }
  try {
    const faq = await prisma.categoryFaq.create({
      data: {
        categoryId,
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    return NextResponse.json(faq);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
