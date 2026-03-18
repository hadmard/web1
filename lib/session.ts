import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asMemberType, ensureEffectiveMemberType, type MemberType } from "@/lib/member-access";
import { resolvePermissionFlags } from "@/lib/member-permissions";

export type Session = {
  sub: string;
  account: string;
  name: string | null;
  displayName: string;
  email: string;
  role: string | null;
  memberType: MemberType;
  rankingWeight: number;
  memberTypeExpiresAt: string | null;
  canPublishWithoutReview: boolean;
  canManageMembers: boolean;
  canDeleteOwnContent: boolean;
  canDeleteMemberContent: boolean;
  canDeleteAllContent: boolean;
  canEditOwnContent: boolean;
  canEditMemberContent: boolean;
  canEditAllContent: boolean;
};

/** 服务端获取当前登录用户（含角色），未登录返回 null */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  let dbMember:
    | {
      id: string;
      email: string;
      name: string | null;
      enterprise?: {
        companyShortName: string | null;
        companyName: string | null;
        contactPerson: string | null;
      } | null;
      role: string | null;
        memberType: string;
        rankingWeight: number;
        memberTypeExpiresAt: Date | null;
        canPublishWithoutReview: boolean;
        canManageMembers?: boolean;
        canDeleteOwnContent?: boolean;
        canDeleteMemberContent?: boolean;
        canDeleteAllContent?: boolean;
        canEditOwnContent?: boolean;
        canEditMemberContent?: boolean;
        canEditAllContent?: boolean;
      }
    | null = null;

  try {
    dbMember = await prisma.member.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        enterprise: {
          select: {
            companyShortName: true,
            companyName: true,
            contactPerson: true,
          },
        },
        role: true,
        memberType: true,
        rankingWeight: true,
        memberTypeExpiresAt: true,
        canPublishWithoutReview: true,
        canManageMembers: true,
        canDeleteOwnContent: true,
        canDeleteMemberContent: true,
        canDeleteAllContent: true,
        canEditOwnContent: true,
        canEditMemberContent: true,
        canEditAllContent: true,
      },
    });
  } catch {
    // Backward-compatible read when DB migration has not been applied yet.
    dbMember = await prisma.member.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        enterprise: {
          select: {
            companyShortName: true,
            companyName: true,
            contactPerson: true,
          },
        },
        role: true,
        memberType: true,
        rankingWeight: true,
        memberTypeExpiresAt: true,
        canPublishWithoutReview: true,
      },
    });
  }
  if (!dbMember) return null;

  const effective = await ensureEffectiveMemberType({
    id: dbMember.id,
    memberType: dbMember.memberType,
    memberTypeExpiresAt: dbMember.memberTypeExpiresAt,
    rankingWeight: dbMember.rankingWeight,
  });

  const permissions = resolvePermissionFlags({
    role: dbMember.role ?? payload.role ?? null,
    canPublishWithoutReview: dbMember.canPublishWithoutReview ?? false,
    canManageMembers: dbMember.canManageMembers ?? false,
    canDeleteOwnContent: dbMember.canDeleteOwnContent ?? false,
    canDeleteMemberContent: dbMember.canDeleteMemberContent ?? false,
    canDeleteAllContent: dbMember.canDeleteAllContent ?? false,
    canEditOwnContent: dbMember.canEditOwnContent ?? false,
    canEditMemberContent: dbMember.canEditMemberContent ?? false,
    canEditAllContent: dbMember.canEditAllContent ?? false,
  });

  const displayName =
    dbMember.enterprise?.companyShortName?.trim() ||
    dbMember.enterprise?.companyName?.trim() ||
    dbMember.name?.trim() ||
    dbMember.enterprise?.contactPerson?.trim() ||
    dbMember.email.split("@")[0]?.trim() ||
    "会员";

  return {
    sub: payload.sub,
    account: dbMember.email,
    name: dbMember.name ?? null,
    displayName,
    email: payload.email,
    role: dbMember.role ?? payload.role ?? null,
    memberType: asMemberType(effective.memberType),
    rankingWeight: effective.rankingWeight,
    memberTypeExpiresAt: dbMember.memberTypeExpiresAt?.toISOString() ?? null,
    canPublishWithoutReview: permissions.canPublishWithoutReview,
    canManageMembers: permissions.canManageMembers,
    canDeleteOwnContent: permissions.canDeleteOwnContent,
    canDeleteMemberContent: permissions.canDeleteMemberContent,
    canDeleteAllContent: permissions.canDeleteAllContent,
    canEditOwnContent: permissions.canEditOwnContent,
    canEditMemberContent: permissions.canEditMemberContent,
    canEditAllContent: permissions.canEditAllContent,
  };
}

export function requireSuperAdmin(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN";
}

export function requireAdminOrSuper(session: Session | null): boolean {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}
