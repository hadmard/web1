import { prisma } from "@/lib/prisma";

export function normalizeArticleTitle(input: string | null | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export async function findDuplicateArticleByTitle(title: string, excludeId?: string | null) {
  const normalized = normalizeArticleTitle(title);
  if (!normalized) return null;

  return prisma.article.findFirst({
    where: {
      title: { equals: normalized, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: {
      id: true,
      title: true,
      categoryHref: true,
      subHref: true,
      status: true,
    },
  });
}
