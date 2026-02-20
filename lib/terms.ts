import { prisma } from "./prisma";

export async function getTermBySlug(slug: string) {
  return prisma.term.findUnique({ where: { slug } });
}

export async function getTermSlugs() {
  return prisma.term.findMany({ select: { slug: true } });
}

export async function getTermsBySlugs(slugs: string[]): Promise<{ slug: string; title: string }[]> {
  if (slugs.length === 0) return [];
  const terms = await prisma.term.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, title: true },
  });
  return terms.map((t) => ({ slug: t.slug, title: t.title }));
}
