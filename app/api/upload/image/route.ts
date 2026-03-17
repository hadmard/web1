import { randomUUID } from "crypto";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

const MAX_SERVER_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const EXTENSION_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function sanitizeFolder(input: string) {
  const cleaned = input
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.length > 0 ? cleaned : ["misc"];
}

function toUploadDiskPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed.startsWith("/uploads/")) return null;
  const parts = trimmed
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts[0] !== "uploads") return null;
  return path.join(process.cwd(), "public", ...parts);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  const diskPath = toUploadDiskPath(src);
  if (!diskPath) {
    return NextResponse.json({ error: "图片路径无效" }, { status: 400 });
  }

  try {
    await access(diskPath);
    const file = await readFile(diskPath);
    const ext = path.extname(diskPath).toLowerCase();
    return new NextResponse(file, {
      headers: {
        "Content-Type": EXTENSION_MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }
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
  const publicUrl = `/${relativeDir}/${fileName}`;

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: publicUrl,
    servedUrl: resolveUploadedImageUrl(publicUrl),
  });
}
