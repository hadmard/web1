import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importRichTextDocument } from "@/lib/richtext-document-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录，无法导入文档" }, { status: 401 });
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
