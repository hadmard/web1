import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export type BuyingFaqItem = {
  id: string;
  question: string;
  answer: string;
  sort: number;
  visible: boolean;
};

export async function getBuyingFaqs(options?: { visibleOnly?: boolean }) {
  noStore();
  const visibleOnly = options?.visibleOnly ?? true;

  const items = await prisma.buyingFaq.findMany({
    where: visibleOnly ? { visible: true } : undefined,
    orderBy: [{ sort: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      sort: true,
      visible: true,
    },
  });

  return items satisfies BuyingFaqItem[];
}
