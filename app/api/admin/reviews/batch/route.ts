import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";
import { pushApprovedNewsToBaidu } from "@/lib/baidu-submit";

type Target = "article" | "gallery" | "feedback";
type ReviewStatus = "approved" | "rejected" | "pending" | "draft";

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "仅主管理员可批量审核" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const target = body.target as Target | undefined;
  const status = body.status as ReviewStatus | undefined;
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  if (target !== "article" && target !== "gallery" && target !== "feedback") {
    return NextResponse.json({ error: "目标类型非法" }, { status: 400 });
  }
  if (!status || !["draft", "pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "状态非法" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "请传入至少一个 ID" }, { status: 400 });
  }

  const uniqueIds = ids.filter((id, index) => ids.indexOf(id) === index);
  let count = 0;

  if (target === "article") {
    const result = await prisma.article.updateMany({
      where: { id: { in: uniqueIds } },
      data: {
        status,
        reviewedAt: status === "approved" || status === "rejected" ? new Date() : null,
        reviewedById: session.sub,
      },
    });
    count = result.count;

    if (status === "approved" && count > 0) {
      const approvedArticles = await prisma.article.findMany({
        where: { id: { in: uniqueIds }, status: "approved" },
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          status: true,
          categoryHref: true,
          subHref: true,
        },
      });

      await Promise.allSettled(
        approvedArticles.map((article) =>
          pushApprovedNewsToBaidu(article, {
            actorId: session.sub,
            actorEmail: session.email,
            source: "admin_article_batch_review",
          }),
        ),
      );

      if (
        approvedArticles.some(
          (article) =>
            (article.categoryHref ?? "").startsWith("/news") ||
            (article.subHref ?? "").startsWith("/news") ||
            (article.categoryHref ?? "").startsWith("/brands/buying") ||
            (article.subHref ?? "").startsWith("/brands/buying"),
        )
      ) {
        revalidatePath("/sitemap.xml");
      }
    }
  } else if (target === "gallery") {
    const result = await prisma.galleryImage.updateMany({
      where: { id: { in: uniqueIds } },
      data: {
        status,
        reviewedAt: status === "approved" || status === "rejected" ? new Date() : null,
        reviewedById: session.sub,
      },
    });
    count = result.count;
  } else {
    const result = await prisma.standardFeedback.updateMany({
      where: { id: { in: uniqueIds } },
      data: { status },
    });
    count = result.count;
  }

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: `${target}_review_batch_status_change`,
    targetType: target,
    detail: JSON.stringify({ status, count, ids: uniqueIds }),
  });

  return NextResponse.json({ ok: true, count });
}
