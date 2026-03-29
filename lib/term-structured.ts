export type TermSection = {
  heading: string;
  body: string;
};

const CHINESE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeWhitespace(input: string) {
  return input.replace(/\r\n?/g, "\n").trim();
}

function headingPrefix(index: number) {
  return index < CHINESE_NUMERALS.length ? `${CHINESE_NUMERALS[index]}、` : `${index + 1}. `;
}

function stripHeadingMarker(input: string) {
  return input
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/^\s*(?:第[一二三四五六七八九十百千万\d]+[章节部分篇]|[（(]?[一二三四五六七八九十百千万\dIVXivx]+[）).、]|[一二三四五六七八九十百千万\dIVXivx]+[.、)])\s*/, "")
    .trim();
}

function isHeadingLine(input: string) {
  const line = input.trim();
  if (!line) return false;
  return /^(#{1,6}\s*.+|(?:第[一二三四五六七八九十百千万\d]+[章节部分篇]|[（(]?[一二三四五六七八九十百千万\dIVXivx]+[）).、]|[一二三四五六七八九十百千万\dIVXivx]+[.、)])\s*.+)$/.test(line);
}

export function isValidTermStructuredContent(input: string) {
  const normalized = normalizeWhitespace(input);
  const sectionCount = (normalized.match(/<section>/g) ?? []).length;
  const headingCount = (normalized.match(/<h3>/g) ?? []).length;
  const paragraphCount = (normalized.match(/<p>/g) ?? []).length;
  return sectionCount > 0 && sectionCount === headingCount && sectionCount === paragraphCount;
}

export function buildTermStructuredHtml(sections: TermSection[]) {
  return sections
    .map((section) => {
      const heading = escapeHtml(section.heading.trim() || "概述");
      const body = escapeHtml(section.body.trim() || "暂无说明").replace(/\n/g, "<br />");
      return `<section><h3>${heading}</h3><p>${body}</p></section>`;
    })
    .join("");
}

export function parseTermStructuredHtml(input: string) {
  const normalized = normalizeWhitespace(input);
  if (!isValidTermStructuredContent(normalized)) {
    return [] as TermSection[];
  }

  const sections = Array.from(
    normalized.matchAll(/<section>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/section>/gi)
  ).map((match) => ({
    heading: decodeHtml(match[1] || "").trim(),
    body: decodeHtml(match[2] || "").trim(),
  }));

  return sections.filter((section) => section.heading || section.body);
}

export function parseTermPlainTextSections(input: string) {
  const normalized = normalizeWhitespace(input);
  if (!normalized) return [] as TermSection[];

  const lines = normalized.split("\n");
  const sections: TermSection[] = [];
  let current: TermSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (current && current.body) current.body += "\n";
      continue;
    }

    if (isHeadingLine(line)) {
      if (current && (current.heading || current.body.trim())) {
        current.body = current.body.trim();
        sections.push(current);
      }
      current = { heading: stripHeadingMarker(line) || "概述", body: "" };
      continue;
    }

    if (!current) {
      current = { heading: "概述", body: line.trim() };
      continue;
    }

    current.body = current.body ? `${current.body}\n${line.trim()}` : line.trim();
  }

  if (current && (current.heading || current.body.trim())) {
    current.body = current.body.trim();
    sections.push(current);
  }

  return sections.filter((section) => section.heading || section.body);
}

export function normalizeTermContent(input: string) {
  const normalized = normalizeWhitespace(input);
  if (!normalized) return "";
  if (isValidTermStructuredContent(normalized)) return normalized;

  const sections = parseTermPlainTextSections(normalized);
  if (sections.length === 0) return "";
  return buildTermStructuredHtml(sections);
}

export function formatTermContentForEditing(input: string) {
  const normalized = normalizeWhitespace(input);
  if (!normalized) return "";
  if (!isValidTermStructuredContent(normalized)) return normalized;

  return parseTermStructuredHtml(normalized)
    .map((section, index) => `${headingPrefix(index)}${section.heading}\n${section.body}`.trim())
    .join("\n\n");
}
