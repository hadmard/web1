import { prisma } from "@/lib/prisma";

export type MemberType = "enterprise_basic" | "personal" | "enterprise_advanced";
export type ContentStatus = "draft" | "pending" | "approved" | "rejected";

export type MemberLike = {
  id: string;
  memberType: string | null;
  memberTypeExpiresAt: Date | null;
  rankingWeight: number | null;
};

export function asMemberType(value: string | null | undefined): MemberType {
  if (value === "enterprise_basic" || value === "enterprise_advanced") return value;
  return "personal";
}

export async function ensureEffectiveMemberType(member: MemberLike): Promise<{
  memberType: MemberType;
  rankingWeight: number;
  downgraded: boolean;
}> {
  const currentType = asMemberType(member.memberType);
  const expiresAt = member.memberTypeExpiresAt;
  const now = new Date();

  if (currentType !== "personal" && expiresAt && expiresAt <= now) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        memberType: "personal",
        rankingWeight: 0,
        autoDowngradedAt: now,
      },
    });
    return { memberType: "personal", rankingWeight: 0, downgraded: true };
  }

  return {
    memberType: currentType,
    rankingWeight: member.rankingWeight ?? 0,
    downgraded: false,
  };
}

export function canSubmitStandardFeedback(memberType: MemberType): boolean {
  return memberType === "personal" || memberType === "enterprise_advanced";
}

export function canLinkStandards(memberType: MemberType): boolean {
  return memberType === "enterprise_advanced";
}

export function canLinkTerms(memberType: MemberType): boolean {
  return memberType === "enterprise_advanced";
}

export function canUploadUnlimited(memberType: MemberType): boolean {
  return memberType === "enterprise_advanced";
}

export function canDownloadStandard(memberType: MemberType, enabled: boolean): boolean {
  return memberType === "personal" && enabled;
}

export function canDownloadReport(memberType: MemberType, enabled: boolean): boolean {
  return memberType === "personal" && enabled;
}

export function defaultContentStatusForSubmission(options?: {
  reviewRequired?: boolean;
  role?: string | null;
  canPublishWithoutReview?: boolean;
}): ContentStatus {
  const reviewRequired = options?.reviewRequired ?? true;
  const role = options?.role;
  const canBypass = options?.canPublishWithoutReview ?? false;

  if (role === "SUPER_ADMIN") return "approved";
  if (role === "ADMIN" && (!reviewRequired || canBypass)) return "approved";
  return "pending";
}
