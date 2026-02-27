import { prisma } from "@/lib/prisma";

export function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function generateUniqueArticleSlug(title: string) {
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
