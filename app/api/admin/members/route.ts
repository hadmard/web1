import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** 主账号：列出分管理员（ADMIN）及主账号（SUPER_ADMIN），不含密码 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const members = await prisma.member.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(members);
}

/** 主账号：创建分管理员账号 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "需要主账号权限" }, { status: 403 });
  }
  const body = await request.json();
  const { email, password, name } = body;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "邮箱与密码必填" }, { status: 400 });
  }
  const existing = await prisma.member.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const member = await prisma.member.create({
    data: {
      email,
      passwordHash,
      name: typeof name === "string" ? name : null,
      role: "ADMIN",
      membershipLevel: "admin",
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(member);
}
