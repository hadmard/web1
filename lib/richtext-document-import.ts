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
const IMPORT_IMAGE_OPTIMIZE_MIN_BYTES = 320 * 1024;
const IMPORT_IMAGE_MAX_WIDTH = 1600;
const IMPORT_IMAGE_WEBP_QUALITY = 82;
const GENERIC_FILENAME_TITLES = new Set(["doc", "docx", "document", "txt", "untitled", "wen-dang"]);
const MAX_IMPORTED_TITLE_LENGTH = 120;

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
  tag: string;
};

const BLOCK_TAG_PATTERN = /<(h[1-6]|p|div|section|article|figure)[^>]*>([\s\S]*?)<\/\1>/gi;
const DOCX_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='\u6807\u9898'] => h1:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='\u6807\u9898 1'] => h1:fresh",
  "p[style-name='\u6807\u98981'] => h1:fresh",
];

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

async function optimizeImportedImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  const normalizedMimeType = mimeType.toLowerCase();
  const originalExt = IMAGE_EXTENSIONS[normalizedMimeType];
  if (!originalExt) {
    throw new Error(`鏆備笉鏀寔 ${mimeType} 鍥剧墖鏍煎紡`);
  }

  if (
    imageBuffer.byteLength < IMPORT_IMAGE_OPTIMIZE_MIN_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(normalizedMimeType)
  ) {
    return { buffer: imageBuffer, mimeType: normalizedMimeType, ext: originalExt };
  }

  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(imageBuffer, { failOn: "none" }).metadata();
    const shouldResize = typeof metadata.width === "number" && metadata.width > IMPORT_IMAGE_MAX_WIDTH;
    const shouldReencode = normalizedMimeType === "image/png" || normalizedMimeType === "image/jpeg";

    if (!shouldResize && !shouldReencode) {
      return { buffer: imageBuffer, mimeType: normalizedMimeType, ext: originalExt };
    }

    let pipeline = sharp(imageBuffer, { failOn: "none" });
    if (shouldResize) {
      pipeline = pipeline.resize({
        width: IMPORT_IMAGE_MAX_WIDTH,
        withoutEnlargement: true,
      });
    }

    const optimizedBuffer = await pipeline
      .webp({
        quality: IMPORT_IMAGE_WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer();

    if (optimizedBuffer.byteLength >= imageBuffer.byteLength * 0.95 && !shouldResize) {
      return { buffer: imageBuffer, mimeType: normalizedMimeType, ext: originalExt };
    }

    return {
      buffer: optimizedBuffer,
      mimeType: "image/webp",
      ext: ".webp",
    };
  } catch {
    return { buffer: imageBuffer, mimeType: normalizedMimeType, ext: originalExt };
  }
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

function normalizeImportedTitleText(input: string) {
  return stripHtmlTags(input)
    .replace(/[\u00a0\u2002-\u200b\u202f\u205f\u3000]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*([:\uFF1A;\uFF1B,\uFF0C.\u3002!?\uFF01\uFF1F\u3001|\uFF5C\u300B\u3009\u3011\u3015\uFF09\]])/g, "$1")
    .replace(/([\u300A\u3008\u3010\u3014\uFF08\[])\s*/g, "$1")
    .replace(/([\u4e00-\u9fff])\s+(?=[0-9A-Za-z])/g, "$1")
    .replace(/([0-9A-Za-z])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .trim();
}

function normalizeComparableTitle(input: string) {
  return normalizeImportedTitleText(input).replace(/[^0-9A-Za-z\u4e00-\u9fff]+/g, "").toLowerCase();
}

function isReasonableStructuredTitleCandidate(rawText: string) {
  const text = normalizeImportedTitleText(rawText);
  if (!text) return false;
  if (text.length < 4 || text.length > MAX_IMPORTED_TITLE_LENGTH) return false;
  return true;
}

function isReasonableFilenameTitle(text: string) {
  const normalized = normalizeImportedTitleText(text);
  if (!normalized || normalized.length > MAX_IMPORTED_TITLE_LENGTH) return false;
  if (GENERIC_FILENAME_TITLES.has(normalized.toLowerCase())) return false;
  if (/^\d+$/.test(normalized)) return false;
  return isReasonableStructuredTitleCandidate(normalized);
}

function extractLeadingBlock(html: string): BlockMatch | null {
  const match = html.match(/^\s*<(h[1-6]|p|div|section|article|figure)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!match || typeof match.index !== "number") return null;
  return {
    full: match[0],
    text: stripHtmlTags(match[2] ?? ""),
    start: match.index,
    end: match.index + match[0].length,
    tag: String(match[1] ?? "").toLowerCase(),
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
    tag: "h1",
  };
}

function extractBlockMatches(html: string) {
  const matches: BlockMatch[] = [];
  let match: RegExpExecArray | null;

  BLOCK_TAG_PATTERN.lastIndex = 0;
  while ((match = BLOCK_TAG_PATTERN.exec(html)) !== null) {
    matches.push({
      full: match[0],
      text: stripHtmlTags(match[2] ?? ""),
      start: match.index,
      end: match.index + match[0].length,
      tag: String(match[1] ?? "").toLowerCase(),
    });
  }

  return matches;
}

function extractFirstMeaningfulBlock(html: string) {
  return extractBlockMatches(html).find((block) => block.text.trim());
}

function detectTitleFromHtml(rawHtml: string, fallbackTitle: string) {
  const heading = extractFirstHeadingBlock(rawHtml);
  if (heading && isReasonableStructuredTitleCandidate(heading.text)) {
    return { title: normalizeImportedTitleText(heading.text), titleSource: "heading" as const };
  }

  const leading = extractFirstMeaningfulBlock(rawHtml) ?? extractLeadingBlock(rawHtml);
  if (leading && isReasonableStructuredTitleCandidate(leading.text)) {
    return { title: normalizeImportedTitleText(leading.text), titleSource: "firstLine" as const };
  }

  if (isReasonableFilenameTitle(fallbackTitle)) {
    return { title: normalizeImportedTitleText(fallbackTitle), titleSource: "filename" as const };
  }

  return { title: "", titleSource: "none" as const };
}

function dedupeLeadingTitleFromHtml(html: string, title: string, titleSource: ImportedTitleSource) {
  if (!html || !title || (titleSource !== "heading" && titleSource !== "firstLine")) {
    return html;
  }

  const normalizedTitle = normalizeComparableTitle(title);
  if (!normalizedTitle) return html;

  let nextHtml = html.trim();

  while (nextHtml) {
    const leading = extractFirstMeaningfulBlock(nextHtml) ?? extractLeadingBlock(nextHtml);
    if (!leading) break;

    const normalizedLeading = normalizeComparableTitle(leading.text);
    if (!normalizedLeading || normalizedTitle !== normalizedLeading) break;

    nextHtml = `${nextHtml.slice(0, leading.start)}${nextHtml.slice(leading.end)}`.trim();
  }

  return nextHtml;
}

async function saveImportedImage(imageBuffer: Buffer, mimeType: string) {
  const optimized = await optimizeImportedImage(imageBuffer, mimeType);
  const ext = optimized.ext;
  if (!ext) {
    throw new Error(`暂不支持 ${mimeType} 图片格式`);
  }

  const relativeDir = path.join("uploads", "content", "doc-import");
  const outputDir = path.join(process.cwd(), "public", relativeDir);
  const fileName = buildStoredImageName(ext);
  const outputPath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, optimized.buffer);

  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

async function importDocx(file: File): Promise<ImportedDocumentPayload> {
  const warnings: string[] = [];
  const fallbackTitle = normalizeBaseName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: DOCX_STYLE_MAP,
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

function removeLeadingTitleLineFromBlocks(blocks: string[], title: string) {
  if (blocks.length === 0) return blocks;

  const nextBlocks = [...blocks];
  const firstBlockLines = nextBlocks[0].split("\n");
  const firstMeaningfulLine = firstBlockLines.find((line) => line.trim()) ?? "";

  if (normalizeComparableTitle(firstMeaningfulLine) !== normalizeComparableTitle(title)) {
    return nextBlocks;
  }

  const remainingFirstBlock = firstBlockLines.slice(1).join("\n").trim();
  if (remainingFirstBlock) {
    nextBlocks[0] = remainingFirstBlock;
    return nextBlocks;
  }

  nextBlocks.shift();
  return nextBlocks;
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
  const firstLineTitle = isReasonableStructuredTitleCandidate(firstLine) ? normalizeImportedTitleText(firstLine) : "";
  const filenameTitle = isReasonableFilenameTitle(fallbackTitle) ? normalizeImportedTitleText(fallbackTitle) : "";
  const title = firstLineTitle || filenameTitle || "";
  const titleSource: ImportedTitleSource = firstLineTitle ? "firstLine" : filenameTitle ? "filename" : "none";

  const bodyBlocks = titleSource === "firstLine" ? removeLeadingTitleLineFromBlocks(blocks, title) : blocks;

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
