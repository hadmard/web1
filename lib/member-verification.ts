export type EffectiveVerificationStatus = "approved" | "pending" | "rejected" | "not_submitted";
export type EffectiveVerificationSource = "member_type" | "verification" | "enterprise_profile";

type MemberLike = {
  memberType?: string | null;
};

type VerificationLike = {
  status?: string | null;
  companyName?: string | null;
  updatedAt?: string | Date | null;
  reviewNote?: string | null;
};

type EnterpriseLike = {
  companyName?: string | null;
  verificationStatus?: string | null;
};

export type EffectiveVerificationResult = {
  status: EffectiveVerificationStatus;
  label: string;
  source: EffectiveVerificationSource;
  isLegacyEnterpriseMember: boolean;
  shouldUpgradeMemberType: boolean;
  companyName: string | null;
  updatedAt: string | null;
  reviewNote: string | null;
};

function toDateString(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function getEffectiveVerificationStatus(params: {
  member?: MemberLike | null;
  verification?: VerificationLike | null;
  enterprise?: EnterpriseLike | null;
}): EffectiveVerificationResult {
  const memberType = params.member?.memberType ?? null;
  const verification = params.verification ?? null;
  const enterprise = params.enterprise ?? null;
  const companyName = enterprise?.companyName ?? verification?.companyName ?? null;
  const updatedAt = toDateString(verification?.updatedAt);
  const reviewNote = verification?.reviewNote ?? null;
  const hasEnterpriseProfile = Boolean(enterprise?.companyName || enterprise?.verificationStatus);
  const isEnterpriseMember = memberType === "enterprise_basic" || memberType === "enterprise_advanced";

  if (isEnterpriseMember) {
    return {
      status: "approved",
      label: "\u5df2\u8ba4\u8bc1",
      source: "member_type",
      isLegacyEnterpriseMember: !verification?.status && hasEnterpriseProfile,
      shouldUpgradeMemberType: false,
      companyName,
      updatedAt,
      reviewNote,
    };
  }

  if (verification?.status === "approved") {
    return {
      status: "approved",
      label: "\u5df2\u901a\u8fc7",
      source: "verification",
      isLegacyEnterpriseMember: false,
      shouldUpgradeMemberType: memberType === "personal",
      companyName,
      updatedAt,
      reviewNote,
    };
  }

  if (verification?.status === "pending" || verification?.status === "reviewing") {
    return {
      status: "pending",
      label: "\u5ba1\u6838\u4e2d",
      source: "verification",
      isLegacyEnterpriseMember: false,
      shouldUpgradeMemberType: false,
      companyName,
      updatedAt,
      reviewNote,
    };
  }

  if (verification?.status === "rejected") {
    return {
      status: "rejected",
      label: "\u9700\u4fee\u6539",
      source: "verification",
      isLegacyEnterpriseMember: false,
      shouldUpgradeMemberType: false,
      companyName,
      updatedAt,
      reviewNote,
    };
  }

  return {
    status: "not_submitted",
    label: "\u672a\u63d0\u4ea4",
    source: hasEnterpriseProfile ? "enterprise_profile" : "verification",
    isLegacyEnterpriseMember: false,
    shouldUpgradeMemberType: false,
    companyName,
    updatedAt,
    reviewNote,
  };
}
