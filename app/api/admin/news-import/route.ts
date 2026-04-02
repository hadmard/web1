import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importNewsFromList } from "@/lib/news-import";

export const dynamic = "force-dynamic";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const listUrl = typeof body.listUrl === "string" ? body.listUrl.trim() : "";
  if (!listUrl) {
    return NextResponse.json({ error: "listUrl 必填" }, { status: 400 });
  }

  try {
    const result = await importNewsFromList(
      {
        listUrl,
        sourceName: typeof body.sourceName === "string" ? body.sourceName : null,
        limit: typeof body.limit === "number" ? body.limit : Number(body.limit || 10),
        includePatterns: Array.isArray(body.includePatterns)
          ? body.includePatterns.filter((item: unknown): item is string => typeof item === "string")
          : [],
        timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : Number(body.timeoutMs || 12000),
        dryRun: body.dryRun === true,
      },
      { actorId: session.sub, actorEmail: session.email },
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "抓取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
