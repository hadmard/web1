import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type SuperAdminConfig = {
  account: string;
  password: string;
  name: string;
};

const DEFAULT_PRIMARY_ADMIN: SuperAdminConfig = {
  account: "yfcccc",
  password: "admin",
  name: "yfcccc",
};

const LEGACY_SUPER_ADMINS: SuperAdminConfig[] = [
  {
    account: "admin",
    password: "admin",
    name: "Admin",
  },
];

export function getPrimaryAdminConfig(): SuperAdminConfig {
  return {
    account: process.env.ADMIN_ACCOUNT?.trim() || DEFAULT_PRIMARY_ADMIN.account,
    password: process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PRIMARY_ADMIN.password,
    name: process.env.ADMIN_NAME?.trim() || DEFAULT_PRIMARY_ADMIN.name,
  };
}

function getSupportedSuperAdminConfigs(): SuperAdminConfig[] {
  const primary = getPrimaryAdminConfig();
  return [
    primary,
    ...LEGACY_SUPER_ADMINS.filter((item) => item.account !== primary.account),
  ];
}

export async function ensurePrimaryAdminAccount(account: string) {
  const config = getSupportedSuperAdminConfigs().find((item) => item.account === account);
  if (!config) return;

  const existing = await prisma.member.findUnique({
    where: { email: config.account },
    select: {
      id: true,
      name: true,
      passwordHash: true,
      role: true,
      membershipLevel: true,
      memberType: true,
      rankingWeight: true,
      canManageMembers: true,
      canDeleteOwnContent: true,
      canDeleteMemberContent: true,
      canDeleteAllContent: true,
      canEditOwnContent: true,
      canEditMemberContent: true,
      canEditAllContent: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  const passwordHash = await bcrypt.hash(config.password, 10);
  const targetData = {
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
  } as const;

  if (!existing) {
    await prisma.member.create({
      data: {
        email: config.account,
        ...targetData,
      },
    });
    return;
  }

  const needsUpdate =
    (existing.name?.trim() || "") !== targetData.name ||
    !(await bcrypt.compare(config.password, existing.passwordHash)) ||
    existing.role !== "SUPER_ADMIN" ||
    existing.membershipLevel !== "admin" ||
    existing.memberType !== "enterprise_advanced" ||
    existing.rankingWeight !== 100 ||
    !existing.canManageMembers ||
    !existing.canDeleteOwnContent ||
    !existing.canDeleteMemberContent ||
    !existing.canDeleteAllContent ||
    !existing.canEditOwnContent ||
    !existing.canEditMemberContent ||
    !existing.canEditAllContent;

  if (needsUpdate) {
    await prisma.member.update({
      where: { id: existing.id },
      data: targetData,
    });
  }
}
