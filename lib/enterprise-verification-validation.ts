const UNIFIED_SOCIAL_CREDIT_CODE_CHARSET = "0123456789ABCDEFGHJKLMNPQRTUWXY";
const UNIFIED_SOCIAL_CREDIT_CODE_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

function countAddressMatches(input: string, pattern: RegExp) {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

export function normalizeEnterprisePhone(value: string) {
  return value.trim().replace(/\s+/g, "").replace(/[－—]/g, "-");
}

export function normalizeUnifiedSocialCreditCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeEnterpriseAddress(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[，]/g, ",")
    .replace(/\s*,\s*/g, ", ");
}

export function isValidEnterprisePhone(value: string) {
  const text = normalizeEnterprisePhone(value);
  const mobilePattern = /^1[3-9]\d{9}$/;
  const landlinePattern = /^(?:0\d{2,3}-?)?\d{7,8}(?:-\d{1,6})?$/;
  return mobilePattern.test(text) || landlinePattern.test(text);
}

export function isValidUnifiedSocialCreditCode(value: string) {
  const text = normalizeUnifiedSocialCreditCode(value);
  if (!/^[0-9A-Z]{18}$/.test(text)) return false;

  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const code = text[i];
    const index = UNIFIED_SOCIAL_CREDIT_CODE_CHARSET.indexOf(code);
    if (index < 0) return false;
    sum += index * UNIFIED_SOCIAL_CREDIT_CODE_WEIGHTS[i];
  }

  const logicCheckCode = (31 - (sum % 31)) % 31;
  return UNIFIED_SOCIAL_CREDIT_CODE_CHARSET[logicCheckCode] === text[17];
}

export function isValidEnterpriseAddress(value: string) {
  const text = normalizeEnterpriseAddress(value);
  if (text.length < 8) return false;

  const topLevelCount = countAddressMatches(text, /(省|市|自治区|特别行政区|自治州|盟)/g);
  const detailCount = countAddressMatches(text, /(区|县|旗|镇|乡|街道|路|街|巷|弄|号)/g);

  return topLevelCount >= 1 && detailCount >= 1;
}

export function getEnterpriseVerificationFormatError(input: {
  contactPhone: string;
  licenseCode: string;
  address: string;
}) {
  if (!isValidEnterprisePhone(input.contactPhone)) {
    return "联系电话格式无效，请填写规范的手机号码或带区号的固定电话。";
  }
  if (!isValidUnifiedSocialCreditCode(input.licenseCode)) {
    return "统一社会信用代码格式无效，请填写 18 位规范代码。";
  }
  if (!isValidEnterpriseAddress(input.address)) {
    return "企业地址格式无效，请填写完整的省/市/区县及详细地址。";
  }
  return null;
}
