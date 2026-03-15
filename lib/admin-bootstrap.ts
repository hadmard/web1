/**
 * 文件说明：该文件封装主管理员账号的运行时引导逻辑。
 * 功能说明：在未额外配置服务器环境变量时，仍可用固定默认主管理员账号完成登录和恢复；若环境变量存在，则优先使用环境变量。
 *
 * 结构概览：
 *   第一部分：默认主管理员配置
 *   第二部分：运行时配置读取
 *   第三部分：主管理员账号引导
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type PrimaryAdminConfig = {
  account: string;
  password: string;
  name: string;
};

// ========== 第一部分：默认主管理员配置 ==========

const DEFAULT_PRIMARY_ADMIN: PrimaryAdminConfig = {
  account: "yfcccc",
  password: "admin",
  name: "admin",
};

// ========== 第二部分：运行时配置读取 ==========

export function getPrimaryAdminConfig(): PrimaryAdminConfig {
  return {
    account: process.env.ADMIN_ACCOUNT?.trim() || DEFAULT_PRIMARY_ADMIN.account,
    password: process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PRIMARY_ADMIN.password,
    name: process.env.ADMIN_NAME?.trim() || DEFAULT_PRIMARY_ADMIN.name,
  };
}

// ========== 第三部分：主管理员账号引导 ==========

export async function ensurePrimaryAdminAccount(account: string) {
  const config = getPrimaryAdminConfig();
  if (config.account !== account) return;

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
    existing.name !== config.name ||
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
