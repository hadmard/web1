const NEWS_TITLE_SUFFIX = "\uFF5C\u6574\u6728\u884C\u4E1A\u8D44\u8BAF";
const MIN_GOOD_LEN = 16;
const TARGET_MIN_LEN = 28;
const TARGET_MAX_LEN = 36;
const ACCEPTABLE_MAX_LEN = 42;
const SEMANTIC_PUNCTUATION = /[\uFF0C\u3002\uFF01\uFF1F\uFF1A\uFF1B,.!?]/;
const STRONG_END_PUNCTUATION = /[\u3002\uFF01\uFF1F.!?]$/;
const TRAILING_PUNCTUATION = /[\uFF0C\u3002\uFF01\uFF1F\uFF1A\uFF1B,.!?]+$/g;
const GENERIC_PREFIXES = [
  "\u4E1A\u7EE9\u9006\u6D41\u800C\u4E0A",
  "\u91CD\u78C5\u6765\u88AD",
  "\u91CD\u78C5\u53D1\u5E03",
  "\u5F3A\u52BF\u6765\u88AD",
  "\u60CA\u8273\u4EAE\u76F8",
  "\u91CD\u78C5\u4EAE\u76F8",
  "\u76DB\u5927\u542F\u5E55",
  "\u5706\u6EE1\u6536\u5B98",
  "\u5706\u6EE1\u843D\u5E55",
];

function normalizeNewsTitle(rawTitle: string) {
  return String(rawTitle || "").replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(title: string) {
  return title.replace(TRAILING_PUNCTUATION, "").trim();
}

function splitTitleClauses(title: string) {
  return (
    title.match(/[^\uFF0C\u3002\uFF01\uFF1F\uFF1A\uFF1B,.!?]+[\uFF0C\u3002\uFF01\uFF1F\uFF1A\uFF1B,.!?]?/g)
      ?.map((part) => part.trim())
      .filter(Boolean) ?? [title]
  );
}

function isWeakClause(text: string) {
  const normalized = stripTrailingPunctuation(text);
  if (normalized.length < MIN_GOOD_LEN) {
    return true;
  }

  return GENERIC_PREFIXES.some((prefix) => normalized.startsWith(prefix) && normalized.length < TARGET_MIN_LEN);
}

function collectSemanticCandidates(title: string) {
  const clauses = splitTitleClauses(title);
  const candidates: string[] = [];
  let current = "";

  for (let index = 0; index < clauses.length; index += 1) {
    current = `${current}${clauses[index]}`.trim();
    const normalized = stripTrailingPunctuation(current);

    if (!normalized) {
      continue;
    }

    const needsMoreContext =
      normalized.length < MIN_GOOD_LEN ||
      isWeakClause(current) ||
      !SEMANTIC_PUNCTUATION.test(current.slice(-1)) ||
      current.endsWith("\uFF0C") ||
      current.endsWith(",") ||
      current.endsWith("\uFF1A") ||
      current.endsWith(":") ||
      current.endsWith("\uFF1B") ||
      current.endsWith(";");

    if (!needsMoreContext) {
      candidates.push(normalized);
    }

    if (!needsMoreContext && normalized.length >= TARGET_MAX_LEN) {
      break;
    }
  }

  return candidates;
}

function chooseBestSemanticTitle(title: string) {
  const candidates = collectSemanticCandidates(title);

  for (const candidate of candidates) {
    if (candidate.length >= TARGET_MIN_LEN && candidate.length <= TARGET_MAX_LEN) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate.length >= MIN_GOOD_LEN && candidate.length <= ACCEPTABLE_MAX_LEN) {
      return candidate;
    }
  }

  if (title.length <= ACCEPTABLE_MAX_LEN) {
    return stripTrailingPunctuation(title);
  }

  const strongBreakIndex = Array.from(title).findIndex((char, index) => {
    if (index + 1 < TARGET_MIN_LEN || index + 1 > ACCEPTABLE_MAX_LEN) {
      return false;
    }

    return /[\u3002\uFF01\uFF1F!?]/.test(char);
  });

  if (strongBreakIndex >= 0) {
    return stripTrailingPunctuation(title.slice(0, strongBreakIndex + 1));
  }

  return stripTrailingPunctuation(title);
}

export function buildNewsTitle(rawTitle: string): string {
  const title = normalizeNewsTitle(rawTitle);

  if (!title) {
    return "\u6574\u6728\u884C\u4E1A\u8D44\u8BAF" + NEWS_TITLE_SUFFIX;
  }

  const semanticTitle = chooseBestSemanticTitle(title);
  return (semanticTitle || title) + NEWS_TITLE_SUFFIX;
}
