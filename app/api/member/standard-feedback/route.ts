import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getEffectiveMemberAccessForMember } from "@/lib/member-access-resolver";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.standardFeedback.findMany({
      where: { memberId: session.sub },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.standardFeedback.count({ where: { memberId: session.sub } }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const memberAccess = await getEffectiveMemberAccessForMember(session.sub, session.memberType);

  if (!memberAccess.features.standardFeedback) {
    return NextResponse.json({ error: "当前会员类型不支持标准反馈" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { content, standardId } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "请填写反馈内容" }, { status: 400 });
  }

  if (typeof standardId === "string" && standardId) {
    const std = await prisma.standard.findUnique({ where: { id: standardId } });
    if (!std) return NextResponse.json({ error: "标准不存在" }, { status: 404 });
  }

  const feedback = await prisma.standardFeedback.create({
    data: {
      memberId: session.sub,
      standardId: typeof standardId === "string" && standardId ? standardId : null,
      content: content.trim(),
      status: "pending",
    },
  });

  return NextResponse.json(feedback);
}
