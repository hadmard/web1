const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ADMIN_ACCOUNT = "admin";
const ADMIN_PASSWORD = "admin";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.member.upsert({
    where: { email: ADMIN_ACCOUNT },
    update: {
      name: "Admin",
      passwordHash,
      passwordPlaintext: ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
      membershipLevel: "admin",
      memberType: "enterprise_advanced",
      rankingWeight: 100,
      canManageMembers: true,
      canDeleteOwnContent: true,
      canDeleteMemberContent: true,
      canDeleteAllContent: true,
      canEditOwnContent: true,
      canEditMemberContent: true,
      canEditAllContent: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: ADMIN_ACCOUNT,
      name: "Admin",
      passwordHash,
      passwordPlaintext: ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
      membershipLevel: "admin",
      memberType: "enterprise_advanced",
      rankingWeight: 100,
      canManageMembers: true,
      canDeleteOwnContent: true,
      canDeleteMemberContent: true,
      canDeleteAllContent: true,
      canEditOwnContent: true,
      canEditMemberContent: true,
      canEditAllContent: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  console.log(`Admin account ready: ${admin.email} / ${ADMIN_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
