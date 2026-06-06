import { pinyin } from "pinyin-pro";
import { prisma } from "./prisma";

export function slugify(input: string) {
  const source = String(input || "").trim();
  const romanized = pinyin(source, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
    v: false,
  }).join(" ");

  return String(romanized || source)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function generateUniqueArticleSlugUnsafe(title: string) {
  const base = slugify(title) || `article-${Date.now()}`;
  let attempt = base;
  let index = 1;

  while (true) {
    const exists = await prisma.article.findUnique({ where: { slug: attempt }, select: { id: true } });
    if (!exists) return attempt;
    index += 1;
    attempt = `${base}-${index}`;
    if (attempt.length > 96) {
      attempt = `${base.slice(0, 80)}-${Date.now()}`;
    }
  }
}

const RESERVED_ARTICLE_SLUGS = new Set([
  "all",
  "news",
  "trends",
  "search",
  "tags",
  "aftermarket",
  "buying",
  "dictionary",
  "standards",
  "market",
]);

function isUnsafeArticleSlugCandidate(value: string | null | undefined) {
  const slug = String(value ?? "").trim().toLowerCase();
  return !slug || /^\d+$/.test(slug) || slug.length < 3 || RESERVED_ARTICLE_SLUGS.has(slug);
}

export async function generateUniqueArticleSlug(...args: Parameters<typeof generateUniqueArticleSlugUnsafe>) {
  const first = await generateUniqueArticleSlugUnsafe(...args);
  if (!isUnsafeArticleSlugCandidate(first)) return first;

  const nextArgs = [...args] as Parameters<typeof generateUniqueArticleSlugUnsafe>;
  const safeSeed = first ? `article-${first}` : `article-${Date.now().toString(36)}`;
  nextArgs[0] = safeSeed as Parameters<typeof generateUniqueArticleSlugUnsafe>[0];

  const second = await generateUniqueArticleSlugUnsafe(...nextArgs);
  if (!isUnsafeArticleSlugCandidate(second)) return second;

  nextArgs[0] = `article-${Date.now().toString(36)}` as Parameters<typeof generateUniqueArticleSlugUnsafe>[0];
  return generateUniqueArticleSlugUnsafe(...nextArgs);
}

