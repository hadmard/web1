import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildArticleDiffSummary, buildArticlePatchData } from "@/lib/article-change";
import { writeOperationLog } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

function isDictionaryPath(input: string | null | undefined) {
  return typeof input === "string" && input.startsWith("/dictionary");
}

function isValidTermStructuredContent(input: string) {
  const sectionCount = (input.match(/<section>/g) ?? []).length;
  const headingCount = (input.match(/<h3>/g) ?? []).length;
  const paragraphCount = (input.match(/<p>/g) ?? []).length;
  return sectionCount > 0 && sectionCount === headingCount && sectionCount === paragraphCount;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      categoryHref: true,
      subHref: true,
    },
  });
  if (!article) return NextResponse.json({ error: "资讯不存在" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch = buildArticlePatchData({
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    coverImage: body.coverImage,
    subHref: body.subHref,
    categoryHref: body.categoryHref,
    tagSlugs: body.tagSlugs,
    relatedTermSlugs: body.relatedTermSlugs,
    relatedStandardIds: body.relatedStandardIds,
    relatedBrandIds: body.relatedBrandIds,
  });

  const hasPatch = Object.values(patch).some((v) => v !== null && String(v).trim() !== "");
  if (!hasPatch) {
    return NextResponse.json({ error: "请至少提交一个修改字段" }, { status: 400 });
  }

  const isDictionary = isDictionaryPath(article.categoryHref) || isDictionaryPath(article.subHref);
  if (isDictionary) {
    if (!patch.patchTitle || !patch.patchContent) {
      return NextResponse.json({ error: "词库修改需按固定格式提交：标题/摘要/小标题正文" }, { status: 400 });
    }
    if (!isValidTermStructuredContent(patch.patchContent)) {
      return NextResponse.json({ error: "词库正文需为小标题分节格式（小标题+正文）" }, { status: 400 });
    }
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const diffSummary = buildArticleDiffSummary(article, patch);

  const created = await prisma.articleChangeRequest.create({
    data: {
      articleId: article.id,
      submitterId: session.sub,
      reason: reason || null,
      ...patch,
      diffSummary: diffSummary || null,
      status: "pending",
    },
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "article_change_request_submit",
    targetType: "article_change_request",
    targetId: created.id,
    detail: JSON.stringify({ articleId: article.id }),
  });

  return NextResponse.json(created);
}
