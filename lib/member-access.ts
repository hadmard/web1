import { prisma } from "@/lib/prisma";
import { getMembershipRule, getMembershipRuleSync } from "@/lib/membership-rules";

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
  return getMembershipRuleSync(memberType).canSubmitStandardFeedback;
}

export function canLinkStandards(memberType: MemberType): boolean {
  return getMembershipRuleSync(memberType).canLinkStandards;
}

export function canLinkTerms(memberType: MemberType): boolean {
  return getMembershipRuleSync(memberType).canLinkTerms;
}

export function canUploadUnlimited(memberType: MemberType): boolean {
  return getMembershipRuleSync(memberType).galleryUploadLimit == null;
}

export function canDownloadStandard(memberType: MemberType, enabled: boolean): boolean {
  return enabled && getMembershipRuleSync(memberType).canDownloadStandard;
}

export function canDownloadReport(memberType: MemberType, enabled: boolean): boolean {
  return enabled && getMembershipRuleSync(memberType).canDownloadReport;
}

export async function canSubmitStandardFeedbackAsync(memberType: MemberType): Promise<boolean> {
  return (await getMembershipRule(memberType)).canSubmitStandardFeedback;
}

export async function canLinkStandardsAsync(memberType: MemberType): Promise<boolean> {
  return (await getMembershipRule(memberType)).canLinkStandards;
}

export async function canLinkTermsAsync(memberType: MemberType): Promise<boolean> {
  return (await getMembershipRule(memberType)).canLinkTerms;
}

export async function canUploadUnlimitedAsync(memberType: MemberType): Promise<boolean> {
  return (await getMembershipRule(memberType)).galleryUploadLimit == null;
}

export async function canDownloadStandardAsync(memberType: MemberType, enabled: boolean): Promise<boolean> {
  return enabled && (await getMembershipRule(memberType)).canDownloadStandard;
}

export async function canDownloadReportAsync(memberType: MemberType, enabled: boolean): Promise<boolean> {
  return enabled && (await getMembershipRule(memberType)).canDownloadReport;
}

export function defaultContentStatusForSubmission(options?: {
  reviewRequired?: boolean;
  role?: string | null;
  canPublishWithoutReview?: boolean;
}): ContentStatus {
  const role = options?.role;
  const canBypass = options?.canPublishWithoutReview ?? false;

  if (role === "SUPER_ADMIN") return "approved";
  if (role === "ADMIN" || canBypass) return "approved";
  return "pending";
}
