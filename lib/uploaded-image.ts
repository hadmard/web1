const UPLOAD_PREFIX = "/uploads/";
const UPLOAD_PROXY_PREFIX = "/api/upload/image?src=";
const LEGACY_UPLOAD_HOSTS = new Set(["cnzhengmu.com", "www.cnzhengmu.com", "jiu.cnzhengmu.com"]);

function isLegacyUploadUrl(value: string) {
  try {
    const parsed = new URL(value);
    return LEGACY_UPLOAD_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith(UPLOAD_PREFIX);
  } catch {
    return false;
  }
}

export function resolveUploadedImageUrl(input: string | null | undefined): string {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "";
  if (isLegacyUploadUrl(value)) {
    return `${UPLOAD_PROXY_PREFIX}${encodeURIComponent(value)}`;
  }
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith(UPLOAD_PROXY_PREFIX)
  ) {
    return value;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith(UPLOAD_PREFIX)) {
    return `${UPLOAD_PROXY_PREFIX}${encodeURIComponent(value)}`;
  }
  return value;
}

export function isUploadedImagePath(input: string | null | undefined): boolean {
  return typeof input === "string" && input.trim().startsWith(UPLOAD_PREFIX);
}
