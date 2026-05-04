const MAINLAND_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export function normalizeMemberPhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, "").trim();
}

export function isValidMemberPhone(value: string) {
  return MAINLAND_MOBILE_PATTERN.test(normalizeMemberPhone(value));
}
