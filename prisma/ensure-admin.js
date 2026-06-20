const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for explicit super admin bootstrap.`);
  }
  return value;
}

const PRIMARY_ADMIN = {
  account: requireEnv("ADMIN_ACCOUNT"),
  password: requireEnv("ADMIN_PASSWORD"),
  name: requireEnv("ADMIN_NAME"),
};

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
  const admin = await ensureAdmin(PRIMARY_ADMIN);
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
