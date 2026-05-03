import { prisma } from "../lib/prisma";

const KNOWN_BAD_PENDING_BRANDS = [
  "做整木",
  "因为整木",
  "友实地考察康倍得整木",
  "采体系选购康倍得整木",
  "统规划及整体空间木作",
  "整木门店",
  "高端木作",
  "木作护理",
  "日常清洁",
  "重新连接老客户",
  "很多家庭第一步",
  "整体空间木作",
  "选购康倍得整木",
  "考察康倍得整木",
];

async function main() {
  const pendingCandidates = await prisma.pendingBrand.findMany({
    where: {
      OR: [
        { status: 0 },
        { brandName: { in: KNOWN_BAD_PENDING_BRANDS } },
        { approvedSource: "auto-threshold" },
      ],
    },
    select: {
      id: true,
      brandName: true,
      status: true,
      approvedSource: true,
    },
  });

  if (pendingCandidates.length === 0) {
    console.log("No pending brand candidates to disable.");
    return;
  }

  const idsToIgnore = pendingCandidates
    .filter((item) => item.status !== 2)
    .map((item) => item.id);

  if (idsToIgnore.length > 0) {
    await prisma.pendingBrand.updateMany({
      where: { id: { in: idsToIgnore } },
      data: {
        status: 2,
        approvedSource: "disabled-script",
        triggerReason: "feature-disabled",
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        scanned: pendingCandidates.length,
        updated: idsToIgnore.length,
        disabledBrands: pendingCandidates.map((item) => item.brandName),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
