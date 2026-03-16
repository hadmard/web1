export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function previewText(input: string, max = 160): string {
  const plain = stripHtml(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}

function normalizeSentenceText(input: string): string {
  return stripHtml(input)
    .replace(/[：:]{2,}/g, "：")
    .replace(/[。！？]{2,}/g, "。")
    .trim();
}

function splitSentences(input: string): string[] {
  return normalizeSentenceText(input)
    .split(/(?<=[。！？!?])/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function buildGeoExcerpt(title: string, input: string, max = 120): string {
  const cleanTitle = stripHtml(title || "").trim();
  const plain = normalizeSentenceText(input);
  if (!plain) return cleanTitle;

  const sentences = splitSentences(plain);
  let summary = "";

  for (const sentence of sentences) {
    const candidate = summary ? `${summary}${sentence}` : sentence;
    if (candidate.length > max) {
      if (!summary) {
        summary = previewText(sentence, max);
      }
      break;
    }
    summary = candidate;
    if (summary.length >= Math.min(max, 96)) break;
  }

  if (!summary) {
    summary = previewText(plain, max);
  }

  if (cleanTitle && !summary.includes(cleanTitle)) {
    const withTitle = `${cleanTitle}：${summary}`;
    return withTitle.length <= max ? withTitle : previewText(withTitle, max);
  }

  return summary.length <= max ? summary : previewText(summary, max);
}
