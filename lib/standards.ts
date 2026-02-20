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
