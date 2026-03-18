export type DocumentContributor = {
  name: string;
  joinedAt?: string;
};

export type DocumentVersionRecord = {
  version: string;
  updatedAt?: string;
  note?: string;
};

export type DocumentMetadata = {
  intro: string;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  standardCode: string;
  scope: string;
  materialRequirements: string;
  processRequirements: string;
  executionFlow: string;
  acceptanceCriteria: string;
  contributors: DocumentContributor[];
  versions: DocumentVersionRecord[];
};

export type HeadingAnchor = {
  level: number;
  text: string;
  id: string;
};

export function createEmptyDocumentMetadata(): DocumentMetadata {
  return {
    intro: "",
    seoTitle: "",
    seoKeywords: "",
    seoDescription: "",
    standardCode: "",
    scope: "",
    materialRequirements: "",
    processRequirements: "",
    executionFlow: "",
    acceptanceCriteria: "",
    contributors: [],
    versions: [],
  };
}

function toText(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeContributors(input: unknown): DocumentContributor[] {
  if (!Array.isArray(input)) return [];
  const items: DocumentContributor[] = [];
  for (const item of input) {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = toText(row.name);
    const joinedAt = toText(row.joinedAt);
    if (!name) continue;
    items.push({
      name,
      joinedAt: joinedAt || undefined,
    });
  }
  return items;
}

function normalizeVersions(input: unknown): DocumentVersionRecord[] {
  if (!Array.isArray(input)) return [];
  const items: DocumentVersionRecord[] = [];
  for (const item of input) {
    const row = (item ?? {}) as Record<string, unknown>;
    const version = toText(row.version);
    const updatedAt = toText(row.updatedAt);
    const note = toText(row.note);
    if (!version && !note) continue;
    items.push({
      version: version || "未命名版本",
      updatedAt: updatedAt || undefined,
      note: note || undefined,
    });
  }
  return items;
}

export function normalizeDocumentMetadata(input: unknown): DocumentMetadata {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    intro: toText(row.intro),
    seoTitle: toText(row.seoTitle),
    seoKeywords: toText(row.seoKeywords),
    seoDescription: toText(row.seoDescription),
    standardCode: toText(row.standardCode),
    scope: toText(row.scope),
    materialRequirements: toText(row.materialRequirements),
    processRequirements: toText(row.processRequirements),
    executionFlow: toText(row.executionFlow),
    acceptanceCriteria: toText(row.acceptanceCriteria),
    contributors: normalizeContributors(row.contributors),
    versions: normalizeVersions(row.versions),
  };
}

export function parseDocumentMetadata(input: string | null | undefined): DocumentMetadata {
  if (!input) return createEmptyDocumentMetadata();
  try {
    return normalizeDocumentMetadata(JSON.parse(input));
  } catch {
    return createEmptyDocumentMetadata();
  }
}

export function stringifyDocumentMetadata(input: DocumentMetadata): string {
  return JSON.stringify(normalizeDocumentMetadata(input));
}

function slugifyAnchor(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized || "section";
}

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeadingAnchors(html: string): HeadingAnchor[] {
  const regex = /<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const used = new Map<string, number>();
  const items: HeadingAnchor[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const level = Number(match[1]);
    const text = stripHtml(match[3] || "");
    if (!text) continue;
    const base = slugifyAnchor(text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    items.push({
      level,
      text,
      id: count === 1 ? base : `${base}-${count}`,
    });
  }
  return items;
}

export function addHeadingAnchors(html: string): string {
  const regex = /<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const used = new Map<string, number>();
  return html.replace(regex, (_full, level, attrs, inner) => {
    if (/\sid=("|').*?\1/i.test(attrs)) return `<h${level}${attrs}>${inner}</h${level}>`;
    const text = stripHtml(inner || "");
    if (!text) return `<h${level}${attrs}>${inner}</h${level}>`;
    const base = slugifyAnchor(text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
}

export function splitCommaLikeList(input: string | null | undefined): string[] {
  return String(input || "")
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
