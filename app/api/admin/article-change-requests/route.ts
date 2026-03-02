import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canReviewSubmissions } from "@/lib/content-permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !canReviewSubmissions(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const categoryHref = searchParams.get("categoryHref");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    where.status = status;
  }
  if (categoryHref && typeof categoryHref === "string") {
    where.article = { OR: [{ categoryHref: { startsWith: categoryHref } }, { subHref: { startsWith: categoryHref } }] };
  }

  const [items, total] = await Promise.all([
    prisma.articleChangeRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            coverImage: true,
            tagSlugs: true,
            isPinned: true,
            authorMemberId: true,
            categoryHref: true,
            subHref: true,
          },
        },
        submitter: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.articleChangeRequest.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
