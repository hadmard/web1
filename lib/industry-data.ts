import { prisma } from "./prisma";

export async function getIndustryDataById(id: string) {
  return prisma.industryData.findUnique({ where: { id } });
}

export async function getAllIndustryDataIds() {
  return prisma.industryData.findMany({ select: { id: true } });
}
