import { prisma } from "./prisma";

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } });
}

export async function getAllBrandIds() {
  return prisma.brand.findMany({ select: { id: true } });
}
