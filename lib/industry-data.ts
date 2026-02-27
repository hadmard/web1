import { prisma } from "./prisma";

export async function getIndustryDataById(id: string) {
  return prisma.industryData.findUnique({ where: { id } });
}

export async function getAllIndustryDataIds() {
  return prisma.industryData.findMany({ select: { id: true } });
}

/** 首页最新行业数据：按年份与更新时间取前 N 条 */
export async function getIndustryDataList(limit = 4) {
  return prisma.industryData.findMany({
    orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: { id: true, title: true, year: true },
  });
}
