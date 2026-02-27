import { prisma } from "./prisma";

export async function getStandardById(id: string) {
  return prisma.standard.findUnique({ where: { id } });
}

export async function getStandardByCode(code: string) {
  return prisma.standard.findFirst({ where: { code } });
}

export async function getAllStandardIds() {
  return prisma.standard.findMany({ select: { id: true } });
}

/** 首页热门标准：按年份与更新时间取前 N 条 */
export async function getStandardsList(limit = 6) {
  return prisma.standard.findMany({
    orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: { id: true, title: true, code: true, year: true },
  });
}
