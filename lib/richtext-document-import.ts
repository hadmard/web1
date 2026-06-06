import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { decodeHtmlEntities, escapeHtml, sanitizeRichText } from "@/lib/brand-content";

function toUploadProxyUrl(src: string) {
  const value = String(src || "").trim();
  if (!value) return value;
  if (value.startsWith("/api/upload/image?")) return value;
  if (value.startsWith("/uploads/")) {
    return `/api/upload/image?src=${encodeURIComponent(value)}`;
  }
  return value;
}


export const MAX_DOCUMENT_IMPORT_BYTES = 10 * 1024 * 1024;

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const TXT_MIME_TYPES = new Set(["text/plain"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const GENERIC_FILENAME_TITLES = new Set(["doc", "docx", "document", "txt", "untitled", "wen-dang"]);

export type ImportedTitleSource = "heading" | "firstLine" | "filename" | "none";

export type ImportedDocumentPayload = {
  title: string;
  titleSource: ImportedTitleSource;
  html: string;
  warnings: string[];
};

type BlockMatch = {
  full: string;
  text: string;
  start: number;
  end: number;
};

function getLowerExt(fileName: string) {
  return path.extname(fileName || "").trim().toLowerCase();
}

function normalizeBaseName(fileName: string) {
  const raw = fileName.replace(/\.[^.]+$/, "").trim();
  const sanitized = raw
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || "imported-document";
}

function buildStoredImageName(ext: string) {
  return `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
}

function isDocxFile(file: File) {
  const ext = getLowerExt(file.name);
  if (ext) return ext === ".docx";
  return DOCX_MIME_TYPES.has(file.type);
}

function isTxtFile(file: File) {
  const ext = getLowerExt(file.name);
  if (ext) return ext === ".txt";
  return TXT_MIME_TYPES.has(file.type);
}

function ensureSupportedFile(file: File) {
  if (file.size <= 0) {
    throw new Error("上传文件为空");
  }
  if (file.size >= MAX_DOCUMENT_IMPORT_BYTES) {
    throw new Error("文件大小必须小于 10MB");
  }
  if (isDocxFile(file) || isTxtFile(file)) return;
  throw new Error("仅支持导入 .docx 或 .txt 文件");
}

function stripHtmlTags(input: string) {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeComparableTitle(input: string) {
  return stripHtmlTags(input)
    .replace(/[“”"'‘’`~!@#$%^&*()_\-+=\[\]{}|\\:;,.<>/?，。！？；：、（）【】《》\s]/g, "")
    .toLowerCase();
}

function punctuationRatio(text: string) {
  const punctuationCount = (text.match(/[，。！？；：、,.!?;:()[\]【】《》“”"'-]/g) ?? []).length;
  return punctuationCount / Math.max(1, text.length);
}

function looksLikeLongSentence(text: string) {
  return /[。！？?!]$/.test(text) && text.length >= 18;
}

function isReasonableTitleCandidate(rawText: string) {
  const text = stripHtmlTags(rawText).replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (text.length < 4 || text.length > 80) return false;
  if (/\n/.test(text)) return false;
  if (looksLikeLongSentence(text)) return false;
  if (punctuationRatio(text) > 0.22) return false;
  if ((text.match(/[，。！？；：、,.!?;:]/g) ?? []).length >= 4) return false;
  return true;
}

function isReasonableFilenameTitle(text: string) {
  const normalized = text.trim();
  if (!normalized || normalized.length > 80) return false;
  if (GENERIC_FILENAME_TITLES.has(normalized.toLowerCase())) return false;
  if (/^\d+$/.test(normalized)) return false;
  return isReasonableTitleCandidate(normalized);
}

function extractLeadingBlock(html: string): BlockMatch | null {
  const match = html.match(/^\s*<(h[1-6]|p|div|section|article|figure)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!match || typeof match.index !== "number") return null;
  return {
    full: match[0],
    text: stripHtmlTags(match[2] ?? ""),
    start: match.index,
    end: match.index + match[0].length,
  };
}

function extractFirstHeadingBlock(html: string): BlockMatch | null {
  const match = html.match(/<(h1)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!match || typeof match.index !== "number") return null;
  return {
    full: match[0],
    text: stripHtmlTags(match[2] ?? ""),
    start: match.index,
    end: match.index + match[0].length,
  };
}

function detectTitleFromHtml(rawHtml: string, fallbackTitle: string) {
  const heading = extractFirstHeadingBlock(rawHtml);
  if (heading && isReasonableTitleCandidate(heading.text)) {
    return { title: heading.text, titleSource: "heading" as const };
  }

  const leading = extractLeadingBlock(rawHtml);
  if (leading && isReasonableTitleCandidate(leading.text)) {
    return { title: leading.text, titleSource: "firstLine" as const };
  }

  if (isReasonableFilenameTitle(fallbackTitle)) {
    return { title: fallbackTitle, titleSource: "filename" as const };
  }

  return { title: "", titleSource: "none" as const };
}

function dedupeLeadingTitleFromHtml(html: string, title: string, titleSource: ImportedTitleSource) {
  if (!html || !title || (titleSource !== "heading" && titleSource !== "firstLine")) {
    return html;
  }

  const leading = extractLeadingBlock(html);
  if (!leading) return html;

  const normalizedTitle = normalizeComparableTitle(title);
  const normalizedLeading = normalizeComparableTitle(leading.text);
  if (!normalizedTitle || !normalizedLeading) return html;

  const sameTitle =
    normalizedTitle === normalizedLeading ||
    normalizedLeading.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedLeading);

  if (!sameTitle) return html;

  return `${html.slice(0, leading.start)}${html.slice(leading.end)}`.trim();
}

async function saveImportedImage(imageBuffer: Buffer, mimeType: string) {
  const ext = IMAGE_EXTENSIONS[mimeType.toLowerCase()];
  if (!ext) {
    throw new Error(`暂不支持 ${mimeType} 图片格式`);
  }

  const relativeDir = path.join("uploads", "content", "doc-import");
  const outputDir = path.join(process.cwd(), "public", relativeDir);
  const fileName = buildStoredImageName(ext);
  const outputPath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, imageBuffer);

  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

async function importDocx(file: File): Promise<ImportedDocumentPayload> {
  const warnings: string[] = [];
  const fallbackTitle = normalizeBaseName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const mimeType = String(image.contentType ?? "").toLowerCase();
        try {
          const base64 = await image.read("base64");
          const imageBuffer = Buffer.from(base64, "base64");
          const src = toUploadProxyUrl(await saveImportedImage(imageBuffer, mimeType));
          return { src };
        } catch (error) {
          const message = error instanceof Error ? error.message : "图片转存失败";
          warnings.push(message);
          return { src: "" };
        }
      }),
    }
  );

  warnings.push(...result.messages.map((item) => item.message.trim()).filter(Boolean));

  const titleResult = detectTitleFromHtml(result.value, fallbackTitle);
  const sanitizedHtml = sanitizeRichText(result.value);
  const dedupedHtml = dedupeLeadingTitleFromHtml(sanitizedHtml, titleResult.title, titleResult.titleSource);
  if (!dedupedHtml) {
    throw new Error("文档中没有可导入的正文内容");
  }

  return {
    title: titleResult.title,
    titleSource: titleResult.titleSource,
    html: dedupedHtml,
    warnings,
  };
}

async function importTxt(file: File): Promise<ImportedDocumentPayload> {
  const fallbackTitle = normalizeBaseName(file.name);
  const text = Buffer.from(await file.arrayBuffer()).toString("utf8").replace(/^\uFEFF/, "");
  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    throw new Error("文档中没有可导入的正文内容");
  }

  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const firstLine = normalized.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  const firstLineTitle = isReasonableTitleCandidate(firstLine) ? firstLine : "";
  const filenameTitle = isReasonableFilenameTitle(fallbackTitle) ? fallbackTitle : "";
  const title = firstLineTitle || filenameTitle || "";
  const titleSource: ImportedTitleSource = firstLineTitle ? "firstLine" : filenameTitle ? "filename" : "none";

  const bodyBlocks =
    titleSource === "firstLine" && blocks.length > 0 && normalizeComparableTitle(blocks[0]) === normalizeComparableTitle(title)
      ? blocks.slice(1)
      : blocks;

  const html = bodyBlocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");

  if (!html) {
    throw new Error("文档中没有可导入的正文内容");
  }

  return {
    title,
    titleSource,
    html,
    warnings: [],
  };
}

export async function importRichTextDocument(file: File) {
  ensureSupportedFile(file);
  if (isTxtFile(file)) return importTxt(file);
  if (isDocxFile(file)) return importDocx(file);
  throw new Error("仅支持导入 .docx 或 .txt 文件");
}