import { NextRequest, NextResponse } from "next/server";
import { getArticlesByKeyword } from "@/lib/news-keywords-v2";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "缺少关键词" }, { status: 400 });
  }

  const result = await getArticlesByKeyword(name, 50);
  return NextResponse.json(result);
}
