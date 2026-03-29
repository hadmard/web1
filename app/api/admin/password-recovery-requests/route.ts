import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdminOrSuper } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminOrSuper(session)) {
    return NextResponse.json({ error: "仅管理员可访问。" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  const q = searchParams.get("q")?.trim();

  const items = await prisma.passwordRecoveryRequest.findMany({
    where: {
      ...(status && ["pending", "processing", "sent", "resolved", "rejected"].includes(status)
        ? { status }
        : {}),
      ...(q
        ? {
            OR: [
              { account: { contains: q, mode: "insensitive" } },
              { requestNote: { contains: q, mode: "insensitive" } },
              { contactInfo: { contains: q, mode: "insensitive" } },
              { member: { name: { contains: q, mode: "insensitive" } } },
              { member: { enterprise: { companyName: { contains: q, mode: "insensitive" } } } },
              { member: { enterprise: { companyShortName: { contains: q, mode: "insensitive" } } } },
              { member: { enterprise: { brand: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      member: {
        select: {
          id: true,
          email: true,
          name: true,
          recoveryEmail: true,
          role: true,
          memberType: true,
          enterprise: {
            select: {
              id: true,
              companyName: true,
              companyShortName: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      handledBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    take: 300,
  });

  return NextResponse.json({ items });
}
