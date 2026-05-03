import { pinyin } from "pinyin-pro";
import { decodeHtmlEntities, escapeHtml, sanitizeRichText } from "@/lib/brand-content";

export type DictionaryContentHeading = {
  id: string;
  text: string;
  level: 2 | 3 | 4;
};

type ParsedDictionaryContent = {
  htmlWithHeadingIds: string;
  headings: DictionaryContentHeading[];
};

function stripHtml(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadingText(input: string) {
  return stripHtml(input)
    .replace(/^[#\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createHeadingSlug(text: string, fallbackIndex: number) {
  const normalized = normalizeHeadingText(text);
  if (!normalized) return `section-${fallbackIndex}`;

  const transliterated = pinyin(normalized, { toneType: "none", type: "array" })
    .map((part) => String(part).trim().toLowerCase())
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return transliterated || `section-${fallbackIndex}`;
}

function toUniqueHeadingId(baseId: string, usedIds: Map<string, number>) {
  const count = (usedIds.get(baseId) ?? 0) + 1;
  usedIds.set(baseId, count);
  return count === 1 ? baseId : `${baseId}-${count}`;
}

function detectHeadingLevel(text: string, html: string): 2 | 3 | 4 | null {
  const normalized = normalizeHeadingText(text);
  if (!normalized) return null;
  if (normalized.length > 60) return null;

  const markdownMatch = text.trim().match(/^(#{1,3})\s+/);
  if (markdownMatch) {
    return (Math.min(4, markdownMatch[1].length + 1) as 2 | 3 | 4);
  }

  if (/^第[一二三四五六七八九十百千万零两0-9]+(?:章|节|部分|篇|条)\s*/.test(normalized)) return 2;
  if (/^[一二三四五六七八九十百千万零两]+[、.．]\s*/.test(normalized)) return 2;
  if (/^[0-9]+[、.．]\s*/.test(normalized)) return 2;
  if (/^[（(][一二三四五六七八九十百千万零两0-9]+[）)]\s*/.test(normalized)) return 3;
  if (/^[0-9]+\.[0-9]+(?:\.[0-9]+)?\s+/.test(normalized)) return 3;

  const inlineOnly = html
    .trim()
    .replace(/<(strong|b|em|u|span|a)\b[^>]*>/gi, "")
    .replace(/<\/(strong|b|em|u|span|a)>/gi, "")
    .trim();
  const isShortStandaloneTitle =
    inlineOnly === normalizeHeadingText(inlineOnly) &&
    normalized.length <= 30 &&
    !/[。！？；;.!?]/.test(normalized) &&
    /<(strong|b)\b/i.test(html);

  return isShortStandaloneTitle ? 2 : null;
}

function promoteParagraphHeadings(html: string) {
  return html.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (full, _tag, attrs, inner) => {
    if (/<(?:p|div|section|article|blockquote|ul|ol|table|pre|h[1-6])\b/i.test(inner)) {
      return full;
    }
    const level = detectHeadingLevel(inner, inner);
    if (!level) return full;
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });
}

function injectHeadingIds(html: string): ParsedDictionaryContent {
  const usedIds = new Map<string, number>();
  const headings: DictionaryContentHeading[] = [];
  let headingIndex = 0;

  const htmlWithHeadingIds = html.replace(/<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_full, levelText, attrs, inner) => {
    const level = Number(levelText) as 2 | 3 | 4;
    const text = normalizeHeadingText(inner);
    if (!text) {
      return `<h${level}${attrs}>${inner}</h${level}>`;
    }

    headingIndex += 1;
    const baseId = createHeadingSlug(text, headingIndex);
    const id = toUniqueHeadingId(baseId, usedIds);
    const sanitizedAttrs = String(attrs).replace(/\s+id=(\"[^\"]*\"|'[^']*'|[^\s>]+)/gi, "");

    headings.push({ id, text, level });
    return `<h${level}${sanitizedAttrs} id="${escapeHtml(id)}">${inner}</h${level}>`;
  });

  return { htmlWithHeadingIds, headings };
}

export function parseDictionaryContentWithHeadings(content: string | null | undefined): ParsedDictionaryContent {
  const safeHtml = sanitizeRichText(content ?? "");
  if (!safeHtml) {
    return { htmlWithHeadingIds: "", headings: [] };
  }

  const normalizedHtml = promoteParagraphHeadings(safeHtml);
  return injectHeadingIds(normalizedHtml);
}
