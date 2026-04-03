import { previewText, stripHtml } from "@/lib/text";

function splitKeywordCandidates(title: string) {
  return title
    .split(/[、，,\/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueKeywords(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function buildAutoSeoTitle(title: string) {
  return title.trim();
}

export function hasAutoSeoSource(intro: string, content: string) {
  return Boolean(stripHtml(intro).trim() && stripHtml(content).trim());
}

export function buildAutoSeoKeywords(title: string, kind: "terms" | "standards") {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return "";

  const kindLabel = kind === "terms" ? "整木词库" : "整木标准";
  return uniqueKeywords([trimmedTitle, ...splitKeywordCandidates(trimmedTitle), kindLabel]).slice(0, 5).join(",");
}

export function buildAutoSeoDescription(title: string, intro: string, content: string) {
  const merged = [title.trim(), stripHtml(intro).trim(), stripHtml(content).trim()].filter(Boolean).join("，");
  return merged ? previewText(merged, 120) : "";
}
