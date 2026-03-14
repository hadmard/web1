/**
 * 文件说明：该文件封装主管理员账号的运行时引导逻辑。
 * 功能说明：当服务器已配置管理员环境变量时，首次登录可自动补齐主管理员账号，不依赖重新导入数据库。
 *
 * 结构概览：
 *   第一部分：环境变量读取
 *   第二部分：主管理员账号引导
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type PrimaryAdminConfig = {
  account: string;
  password: string;
  name: string;
};

// ========== 第一部分：环境变量读取 ==========

export function getPrimaryAdminConfig(): PrimaryAdminConfig | null {
  const account = process.env.ADMIN_ACCOUNT?.trim() || "";
  const password = process.env.ADMIN_PASSWORD?.trim() || "";
  const name = process.env.ADMIN_NAME?.trim() || "站点管理员";

  if (!account || !password) return null;
  return { account, password, name };
}

// ========== 第二部分：主管理员账号引导 ==========

export async function ensurePrimaryAdminAccount(account: string) {
  const config = getPrimaryAdminConfig();
  if (!config || config.account !== account) return;

  const existing = await prisma.member.findUnique({
    where: { email: config.account },
    select: {
      id: true,
      name: true,
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
      passwordPlaintext: true,
      passwordHash: true,
    },
  });

  const passwordHash = await bcrypt.hash(config.password, 10);
  const targetData = {
    name: config.name,
    passwordHash,
    passwordPlaintext: config.password,
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
    !existing.canEditAllContent ||
    existing.passwordPlaintext !== config.password;

  if (needsUpdate) {
    await prisma.member.update({
      where: { id: existing.id },
      data: targetData,
    });
  }
}
