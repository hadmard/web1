const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "u", "blockquote", "ul", "ol", "li", "h2", "h3", "a", "img"]);
const DROP_WITH_CONTENT_TAGS = ["script", "style", "iframe", "object", "embed", "svg", "math", "form", "noscript"];
const SUSPICIOUS_TEXT_PATTERN = /[�]{2,}|(?:Ã|Â|â|ð|æ|å|ç){2,}|(?:\?{2,})/;

function decodeNamedEntity(entity: string) {
  switch (entity) {
    case "nbsp":
    case "ensp":
    case "emsp":
      return " ";
    case "amp":
      return "&";
    case "lt":
      return "<";
    case "gt":
      return ">";
    case "quot":
      return '"';
    case "apos":
      return "'";
    case "middot":
      return "·";
    default:
      return `&${entity};`;
  }
}

function attemptLatin1Repair(input: string) {
  try {
    const bytes = Uint8Array.from(Array.from(input), (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return input;
  }
}

function suspiciousScore(value: string) {
  const suspicious = value.match(/[�ÃÂâðæåç]/g)?.length ?? 0;
  return suspicious / Math.max(1, value.length);
}

export function repairMojibake(input: string) {
  const raw = String(input ?? "");
  if (!raw) return "";
  if (!SUSPICIOUS_TEXT_PATTERN.test(raw) && suspiciousScore(raw) < 0.08) return raw;

  const repaired = attemptLatin1Repair(raw);
  if (suspiciousScore(repaired) < suspiciousScore(raw)) {
    return repaired;
  }
  return raw;
}

export function containsSuspiciousText(input: string | null | undefined) {
  const value = String(input ?? "");
  return Boolean(value) && (SUSPICIOUS_TEXT_PATTERN.test(value) || suspiciousScore(value) >= 0.08);
}

export function decodeHtmlEntities(input: string) {
  return repairMojibake(input).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase();
    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return decodeNamedEntity(normalized);
  });
}

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripUnsafeContainers(input: string) {
  let output = input;
  for (const tag of DROP_WITH_CONTENT_TAGS) {
    const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const single = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    output = output.replace(paired, "").replace(single, "");
  }
  return output;
}

function normalizeUnsafeWrappers(input: string) {
  return input
    .replace(/<\/?(?:span|font)\b[^>]*>/gi, "")
    .replace(/\sstyle\s*=\s*(\"([^\"]*)\"|'([^']*)')/gi, "")
    .replace(/<(?:div|section|article|header|footer|aside)\b[^>]*>/gi, "<p>")
    .replace(/<\/(?:div|section|article|header|footer|aside)>/gi, "</p>")
    .replace(/<(?:h1|h4|h5|h6)\b[^>]*>/gi, "<h3>")
    .replace(/<\/(?:h1|h4|h5|h6)>/gi, "</h3>")
    .replace(/<b\b[^>]*>/gi, "<strong>")
    .replace(/<\/b>/gi, "</strong>")
    .replace(/<i\b[^>]*>/gi, "<em>")
    .replace(/<\/i>/gi, "</em>");
}

function isSafeHref(value: string) {
  return /^(https?:|mailto:|tel:|\/)/i.test(value);
}

function isSafeSrc(value: string) {
  return /^(https?:|\/)/i.test(value);
}

function parseAttributes(input: string) {
  const attributes = new Map<string, string>();
  const regex = /([:@\w-]+)(?:\s*=\s*(\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>`]+)))?/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const name = match[1]?.toLowerCase();
    if (!name || name.startsWith("on")) continue;
    const rawValue = match[3] ?? match[4] ?? match[5] ?? "";
    attributes.set(name, decodeHtmlEntities(rawValue).trim());
  }

  return attributes;
}

function sanitizeTag(tagName: string, attrText: string) {
  const tag = tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return "";

  if (tag === "a") {
    const attrs = parseAttributes(attrText);
    const href = attrs.get("href") ?? "";
    if (!isSafeHref(href)) return "";
    const title = attrs.get("title");
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow"${title ? ` title="${escapeHtml(title)}"` : ""}>`;
  }

  if (tag === "img") {
    const attrs = parseAttributes(attrText);
    const src = attrs.get("src") ?? "";
    if (!isSafeSrc(src)) return "";
    const alt = attrs.get("alt") ?? "";
    const title = attrs.get("title");
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""}>`;
  }

  return `<${tag}>`;
}

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeHtml(input: string) {
  return /<[^>]+>/.test(input) || /&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/i.test(input);
}

function textToParagraphs(input: string) {
  const text = normalizeWhitespace(decodeHtmlEntities(input));
  if (!text) return "";

  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function removeEmptyBlocks(input: string) {
  let output = input;
  const emptyPatterns = [
    /<p>(?:\s|&nbsp;|<br>)*<\/p>/gi,
    /<blockquote>(?:\s|&nbsp;|<br>)*<\/blockquote>/gi,
    /<h[23]>(?:\s|&nbsp;|<br>)*<\/h[23]>/gi,
    /<li>(?:\s|&nbsp;|<br>)*<\/li>/gi,
    /<strong>(?:\s|&nbsp;|<br>)*<\/strong>/gi,
    /<em>(?:\s|&nbsp;|<br>)*<\/em>/gi,
    /<u>(?:\s|&nbsp;|<br>)*<\/u>/gi,
  ];
  for (const pattern of emptyPatterns) {
    output = output.replace(pattern, "");
  }
  return output;
}

function repairNestedParagraphs(input: string) {
  return input
    .replace(/<p>\s*(<(?:p|h[23]|blockquote|ul|ol)[^>]*>)/gi, "$1")
    .replace(/(<\/(?:p|h[23]|blockquote|ul|ol)>)\s*<\/p>/gi, "$1");
}

export function sanitizeRichText(input: string | null | undefined) {
  const raw = repairMojibake(String(input ?? "").trim());
  if (!raw) return "";
  if (!looksLikeHtml(raw)) return textToParagraphs(raw);

  let html = normalizeWhitespace(decodeHtmlEntities(raw));
  html = stripUnsafeContainers(html);
  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:meta|link|base|input|button|textarea|select)\b[^>]*>/gi, "")
    .replace(/<\/(?:meta|link|base|input|button|textarea|select)>/gi, "");
  html = normalizeUnsafeWrappers(html);
  html = html.replace(/<br\s*\/?>/gi, "<br>");
  html = html.replace(/<([a-z0-9-]+)\b([^>]*)>/gi, (_match, tagName, attrs) => sanitizeTag(tagName, attrs));
  html = html.replace(/<\/([a-z0-9-]+)>/gi, (_match, tagName) => {
    const tag = tagName.toLowerCase();
    return ALLOWED_TAGS.has(tag) && tag !== "img" ? `</${tag}>` : "";
  });
  html = html
    .replace(/<p>\s*(<img\b[^>]*>)\s*<\/p>/gi, "$1")
    .replace(/(?:<br>\s*){3,}/gi, "<br><br>")
    .replace(/\s+(<\/(?:p|li|blockquote|h2|h3|ul|ol)>)/gi, "$1")
    .replace(/(<(?:p|li|blockquote|h2|h3)>)[\s\n]+/gi, "$1");
  html = repairNestedParagraphs(removeEmptyBlocks(html)).trim();
  return html || textToParagraphs(raw);
}

export function htmlToPlainText(input: string | null | undefined) {
  const safeHtml = sanitizeRichText(input);
  if (!safeHtml) return "";

  return normalizeWhitespace(
    decodeHtmlEntities(
      safeHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:p|li|blockquote|h2|h3|ul|ol)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  ).replace(/\s*\n\s*/g, "\n");
}

export function toSummaryText(input: string | null | undefined, maxLength = 120) {
  const text = htmlToPlainText(input);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function normalizePlainTextField(input: unknown) {
  if (typeof input !== "string") return null;
  const text = htmlToPlainText(input).replace(/\n+/g, " ").trim();
  return text || null;
}

export function normalizeRichTextField(input: unknown) {
  if (typeof input !== "string") return null;
  const html = sanitizeRichText(input);
  return html || null;
}

export function hasRenderableContent(input: string | null | undefined) {
  return htmlToPlainText(input).length > 0;
}

export function isLikelyRichText(input: string | null | undefined) {
  const value = String(input ?? "");
  return BLOCK_TAGS.size > 0 && /<(p|div|span|br|strong|b|em|i|ul|ol|li|h[1-6]|blockquote)\b/i.test(value);
}
