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

const LEGACY_UPLOAD_HOSTS = new Set(["cnzhengmu.com", "www.cnzhengmu.com", "jiu.cnzhengmu.com"]);

function sanitizeFolder(input: string) {
  const cleaned = input
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.length > 0 ? cleaned : ["misc"];
}

function normalizeUploadPathFromSrc(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/uploads/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!LEGACY_UPLOAD_HOSTS.has(parsed.hostname.toLowerCase())) return "";
    return parsed.pathname.startsWith("/uploads/") ? parsed.pathname : "";
  } catch {
    return "";
  }
}

function toUploadDiskPath(src: string) {
  const normalized = normalizeUploadPathFromSrc(src);
  if (!normalized) return null;
  const parts = normalized
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts[0] !== "uploads") return null;
  return path.join(process.cwd(), "public", ...parts);
}

function sanitizeRemoteImageUrl(input: string) {
  const value = input.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveExtensionFromUrl(remoteUrl: URL, mimeType: string) {
  const byMime = MIME_EXTENSIONS[mimeType.toLowerCase()];
  if (byMime) return byMime;
  const ext = path.extname(remoteUrl.pathname || "").toLowerCase();
  return ext || ".png";
}

async function writeUploadedImage(bytes: Uint8Array, folderRaw: string, ext: string) {
  const folderSegments = sanitizeFolder(folderRaw);
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`;
  const relativeDir = path.posix.join("uploads", ...folderSegments);
  const outputDir = path.join(process.cwd(), "public", ...relativeDir.split("/"));
  const outputPath = path.join(outputDir, fileName);
  const publicUrl = `/${relativeDir}/${fileName}`;

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, bytes);

  return {
    url: publicUrl,
    servedUrl: resolveUploadedImageUrl(publicUrl),
  };
}

async function fetchLegacyUpload(src: string, method: "GET" | "HEAD") {
  const uploadPath = normalizeUploadPathFromSrc(src);
  if (!uploadPath) return null;

  const candidates = [
    `https://jiu.cnzhengmu.com${uploadPath}`,
    `https://www.cnzhengmu.com${uploadPath}`,
    `https://cnzhengmu.com${uploadPath}`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method,
        headers: { Accept: "image/*,*/*;q=0.8" },
        cache: "force-cache",
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const body = method === "HEAD" ? null : await response.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // Try the next legacy origin.
    }
  }

  return null;
}

async function buildImageResponse(src: string, method: "GET" | "HEAD") {
  const diskPath = toUploadDiskPath(src);
  if (!diskPath) {
    return NextResponse.json({ error: "图片路径无效" }, { status: 400 });
  }

  try {
    await access(diskPath);
    const ext = path.extname(diskPath).toLowerCase();
    const file = method === "HEAD" ? null : await readFile(diskPath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": EXTENSION_MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    const legacyResponse = await fetchLegacyUpload(src, method);
    if (legacyResponse) return legacyResponse;
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }
}

async function uploadRemoteImage(remoteUrlValue: string, folderRaw: string) {
  const remoteUrl = sanitizeRemoteImageUrl(remoteUrlValue);
  if (!remoteUrl) {
    return NextResponse.json({ error: "远程图片地址无效" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(remoteUrl, {
      headers: { Accept: "image/*,*/*;q=0.8" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "远程图片下载失败" }, { status: 400 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "远程图片下载失败" }, { status: 400 });
  }

  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "远程地址不是图片" }, { status: 400 });
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_SERVER_IMAGE_BYTES) {
    return NextResponse.json({ error: "远程图片文件过大" }, { status: 400 });
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_SERVER_IMAGE_BYTES) {
    return NextResponse.json({ error: "远程图片文件过大" }, { status: 400 });
  }

  const payload = await writeUploadedImage(bytes, folderRaw, resolveExtensionFromUrl(remoteUrl, contentType));
  return NextResponse.json(payload);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  return buildImageResponse(src, "GET");
}

export async function HEAD(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  return buildImageResponse(src, "HEAD");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录，无法上传图片" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const remoteUrl = typeof formData?.get("remoteUrl") === "string" ? String(formData?.get("remoteUrl")) : "";
  const folderRaw = typeof formData?.get("folder") === "string" ? String(formData?.get("folder")) : "misc";

  if (remoteUrl) {
    return uploadRemoteImage(remoteUrl, folderRaw);
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请提供图片文件" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  }

  if (file.size > MAX_SERVER_IMAGE_BYTES) {
    return NextResponse.json({ error: "图片文件过大" }, { status: 400 });
  }

  const ext = MIME_EXTENSIONS[file.type.toLowerCase()] || path.extname(file.name || "").toLowerCase() || ".png";
  const payload = await writeUploadedImage(Buffer.from(await file.arrayBuffer()), folderRaw, ext);
  return NextResponse.json(payload);
}
