const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || "站点管理员";

if (!ADMIN_ACCOUNT || !ADMIN_PASSWORD) {
  throw new Error("缺少 ADMIN_ACCOUNT 或 ADMIN_PASSWORD，已停止创建默认管理员账号。");
}

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.member.upsert({
    where: { email: ADMIN_ACCOUNT },
    update: {
      name: ADMIN_NAME,
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
      name: ADMIN_NAME,
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

  console.log(`管理员账号已准备完成：${admin.email}`);
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
