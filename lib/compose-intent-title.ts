type ComposeIntentTitleOptions = {
  keyword: string;
  suffix: string;
  maxLength?: number;
};

function normalizeTitleKeyword(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function clipTitleKeyword(keyword: string, maxLength: number) {
  const normalized = normalizeTitleKeyword(keyword);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, Math.max(0, maxLength)).trim();
}

export function composeIntentTitle({ keyword, suffix, maxLength = 32 }: ComposeIntentTitleOptions) {
  const normalizedSuffix = suffix.trim();
  if (!normalizedSuffix) return normalizeTitleKeyword(keyword);

  const maxKeywordLength = Math.max(1, maxLength - normalizedSuffix.length);
  const clippedKeyword = clipTitleKeyword(keyword, maxKeywordLength);
  return `${clippedKeyword}${normalizedSuffix}`;
}
