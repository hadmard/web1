import { prisma } from "./prisma";

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({
    where: { id },
    include: {
      enterprise: {
        select: {
          id: true,
          companyName: true,
          companyShortName: true,
          logoUrl: true,
          region: true,
          area: true,
          positioning: true,
          productSystem: true,
          contactPhone: true,
          website: true,
        },
      },
    },
  });
}

export async function getAllBrandIds() {
  return prisma.brand.findMany({ where: { isBrandVisible: true }, select: { id: true, slug: true } });
}

/** 首页品牌推荐：取前 N 条 */
export async function getBrandsList(limit = 10) {
  return prisma.brand.findMany({
    where: { isBrandVisible: true },
    orderBy: [{ isRecommend: "desc" }, { sortOrder: "desc" }, { rankingWeight: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      tagline: true,
      region: true,
      isRecommend: true,
      displayTemplate: true,
      enterprise: {
        select: {
          id: true,
          companyName: true,
          companyShortName: true,
        },
      },
    },
  });
}
