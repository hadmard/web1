import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { extractNewsKeywords, formatKeywordCsv } from "@/lib/news-keywords-v2";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!title && !content.trim()) {
    return NextResponse.json({ error: "请先填写标题或正文，再生成关键词" }, { status: 400 });
  }

  try {
    const result = await extractNewsKeywords({ title, content });
    const keywords = result.keywords.map((item) => item.keyword).slice(0, 5);

    return NextResponse.json({
      keywords,
      keywordCsv: formatKeywordCsv(keywords),
      pendingBrands: result.pendingBrands.map((item) => item.brandName),
    });
  } catch (error) {
    console.error("POST /api/admin/articles/keyword-preview", error);
    return NextResponse.json({ error: "关键词生成失败，请稍后重试" }, { status: 500 });
  }
}
