const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_ADMIN_PASSWORD = "admin";
const PRIMARY_ADMIN = {
  account: process.env.ADMIN_ACCOUNT?.trim() || "yfcccc",
  password: process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD,
  name: process.env.ADMIN_NAME?.trim() || "yfcccc",
};

const LEGACY_ADMINS = [
  {
    account: "admin",
    password: DEFAULT_ADMIN_PASSWORD,
    name: "Admin",
  },
].filter((item) => item.account !== PRIMARY_ADMIN.account);

async function ensureAdmin(config) {
  const passwordHash = await bcrypt.hash(config.password, 10);

  return prisma.member.upsert({
    where: { email: config.account },
    update: {
      name: config.name,
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
      email: config.account,
      name: config.name,
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
}

async function main() {
  const prepared = [];
  for (const config of [PRIMARY_ADMIN, ...LEGACY_ADMINS]) {
    const admin = await ensureAdmin(config);
    prepared.push(admin.email);
  }

  console.log(`管理员账号已准备完成：${prepared.join(", ")} / 默认密码已恢复`);
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
