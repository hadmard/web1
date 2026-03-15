const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_ADMIN_ACCOUNT = "yfcccc";
const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_ADMIN_NAME = "admin";

const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT?.trim() || DEFAULT_ADMIN_ACCOUNT;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME;

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.member.upsert({
    where: { email: ADMIN_ACCOUNT },
    update: {
      name: ADMIN_NAME,
      passwordHash,
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
      name: ADMIN_NAME,
      passwordHash,
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

  console.log(`管理员账号已准备完成：${admin.email} / 默认密码已恢复`);
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
