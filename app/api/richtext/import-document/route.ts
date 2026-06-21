import { NextResponse } from "next/server";
import { consumeRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { importRichTextDocument } from "@/lib/richtext-document-import";

export const runtime = "nodejs";
const IMPORT_DOCUMENT_WINDOW_MS = 10 * 60 * 1000;
const IMPORT_DOCUMENT_IP_LIMIT = 20;
const IMPORT_DOCUMENT_MEMBER_LIMIT = 30;

export async function POST(request: Request) {
  const ipLimit = consumeRateLimit({
    scope: "import-document:ip",
    identifier: getClientIp(request),
    limit: IMPORT_DOCUMENT_IP_LIMIT,
    windowMs: IMPORT_DOCUMENT_WINDOW_MS,
  });
  if (!ipLimit.allowed) {
    return createRateLimitResponse(ipLimit.retryAfterSec);
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录，无法导入文档" }, { status: 401 });
  }

  const memberLimit = consumeRateLimit({
    scope: "import-document:member",
    identifier: session.sub,
    limit: IMPORT_DOCUMENT_MEMBER_LIMIT,
    windowMs: IMPORT_DOCUMENT_WINDOW_MS,
  });
  if (!memberLimit.allowed) {
    return createRateLimitResponse(memberLimit.retryAfterSec);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传 .docx 或 .txt 文件" }, { status: 400 });
  }

  try {
    const result = await importRichTextDocument(file);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "文档导入失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
