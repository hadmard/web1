import { prisma } from "./prisma";

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } });
}

export async function getAllBrandIds() {
  return prisma.brand.findMany({ select: { id: true } });
}

/** 首页品牌推荐：取前 N 条 */
export async function getBrandsList(limit = 10) {
  return prisma.brand.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, name: true },
  });
}
