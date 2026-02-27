type MaybeString = string | null | undefined;

function normalizeText(input: MaybeString): string {
  return (input ?? "").replace(/\r\n/g, "\n");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function lineDiff(before: string, after: string): string {
  const a = normalizeText(before).split("\n");
  const b = normalizeText(after).split("\n");
  const max = Math.max(a.length, b.length);
  const rows: string[] = [];

  for (let i = 0; i < max; i += 1) {
    const oldLine = a[i] ?? "";
    const newLine = b[i] ?? "";
    if (oldLine === newLine) {
      if (newLine.trim()) rows.push(`<div class="diff-same">${escapeHtml(newLine)}</div>`);
      continue;
    }
    if (oldLine.trim()) rows.push(`<div class="diff-del">- ${escapeHtml(oldLine)}</div>`);
    if (newLine.trim()) rows.push(`<div class="diff-add">+ ${escapeHtml(newLine)}</div>`);
  }

  return rows.join("");
}

export function buildArticlePatchData(input: {
  title?: MaybeString;
  slug?: MaybeString;
  excerpt?: MaybeString;
  content?: MaybeString;
  coverImage?: MaybeString;
  subHref?: MaybeString;
  categoryHref?: MaybeString;
  tagSlugs?: MaybeString;
  relatedTermSlugs?: MaybeString;
  relatedStandardIds?: MaybeString;
  relatedBrandIds?: MaybeString;
}) {
  const pick = (v: MaybeString) => (typeof v === "string" ? v.trim() : null);
  return {
    patchTitle: pick(input.title),
    patchSlug: pick(input.slug),
    patchExcerpt: pick(input.excerpt),
    patchContent: typeof input.content === "string" ? input.content : null,
    patchCoverImage: pick(input.coverImage),
    patchSubHref: pick(input.subHref),
    patchCategoryHref: pick(input.categoryHref),
    patchTagSlugs: pick(input.tagSlugs),
    patchRelatedTermSlugs: pick(input.relatedTermSlugs),
    patchRelatedStandardIds: pick(input.relatedStandardIds),
    patchRelatedBrandIds: pick(input.relatedBrandIds),
  };
}

export function buildArticleDiffSummary(
  original: {
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
  },
  patch: {
    patchTitle: string | null;
    patchSlug: string | null;
    patchExcerpt: string | null;
    patchContent: string | null;
    patchCoverImage: string | null;
  }
): string {
  const blocks: string[] = [];

  if (patch.patchTitle !== null && patch.patchTitle !== original.title) {
    blocks.push(`<h4>标题</h4>${lineDiff(original.title, patch.patchTitle)}`);
  }
  if (patch.patchSlug !== null && patch.patchSlug !== original.slug) {
    blocks.push(`<h4>Slug</h4>${lineDiff(original.slug, patch.patchSlug)}`);
  }
  if (patch.patchExcerpt !== null && patch.patchExcerpt !== (original.excerpt ?? "")) {
    blocks.push(`<h4>摘要</h4>${lineDiff(original.excerpt ?? "", patch.patchExcerpt)}`);
  }
  if (patch.patchCoverImage !== null && patch.patchCoverImage !== (original.coverImage ?? "")) {
    blocks.push(`<h4>封面图</h4>${lineDiff(original.coverImage ?? "", patch.patchCoverImage)}`);
  }
  if (patch.patchContent !== null && patch.patchContent !== original.content) {
    blocks.push(`<h4>正文</h4>${lineDiff(original.content, patch.patchContent)}`);
  }

  return blocks.join("");
}

export function applyArticlePatch<T extends Record<string, unknown>>(
  current: T,
  patch: {
    patchTitle?: string | null;
    patchSlug?: string | null;
    patchExcerpt?: string | null;
    patchContent?: string | null;
    patchCoverImage?: string | null;
    patchSubHref?: string | null;
    patchCategoryHref?: string | null;
    patchTagSlugs?: string | null;
    patchRelatedTermSlugs?: string | null;
    patchRelatedStandardIds?: string | null;
    patchRelatedBrandIds?: string | null;
  }
) {
  const data: Record<string, unknown> = {};
  if (patch.patchTitle !== undefined && patch.patchTitle !== null) data.title = patch.patchTitle;
  if (patch.patchSlug !== undefined && patch.patchSlug !== null) data.slug = patch.patchSlug;
  if (patch.patchExcerpt !== undefined && patch.patchExcerpt !== null) data.excerpt = patch.patchExcerpt || null;
  if (patch.patchContent !== undefined && patch.patchContent !== null) data.content = patch.patchContent;
  if (patch.patchCoverImage !== undefined && patch.patchCoverImage !== null) data.coverImage = patch.patchCoverImage || null;
  if (patch.patchSubHref !== undefined && patch.patchSubHref !== null) data.subHref = patch.patchSubHref || null;
  if (patch.patchCategoryHref !== undefined && patch.patchCategoryHref !== null) data.categoryHref = patch.patchCategoryHref || null;
  if (patch.patchTagSlugs !== undefined && patch.patchTagSlugs !== null) data.tagSlugs = patch.patchTagSlugs || null;
  if (patch.patchRelatedTermSlugs !== undefined && patch.patchRelatedTermSlugs !== null) data.relatedTermSlugs = patch.patchRelatedTermSlugs || null;
  if (patch.patchRelatedStandardIds !== undefined && patch.patchRelatedStandardIds !== null) data.relatedStandardIds = patch.patchRelatedStandardIds || null;
  if (patch.patchRelatedBrandIds !== undefined && patch.patchRelatedBrandIds !== null) data.relatedBrandIds = patch.patchRelatedBrandIds || null;
  return data;
}
