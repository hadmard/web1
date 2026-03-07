import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const MAX_SERVER_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function sanitizeFolder(input: string) {
  const cleaned = input
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.length > 0 ? cleaned : ["misc"];
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录，无法上传图片" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const folderRaw = typeof formData?.get("folder") === "string" ? String(formData?.get("folder")) : "misc";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请提供图片文件" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  }

  if (file.size > MAX_SERVER_IMAGE_BYTES) {
    return NextResponse.json({ error: "图片文件过大" }, { status: 400 });
  }

  const folderSegments = sanitizeFolder(folderRaw);
  const ext =
    MIME_EXTENSIONS[file.type.toLowerCase()] ||
    path.extname(file.name || "").toLowerCase() ||
    ".png";
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

  const relativeDir = path.posix.join("uploads", ...folderSegments);
  const outputDir = path.join(process.cwd(), "public", ...relativeDir.split("/"));
  const outputPath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/${relativeDir}/${fileName}`,
  });
}
