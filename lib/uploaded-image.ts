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

function extractUploadSrcFromProxy(value: string) {
  if (!value.startsWith(UPLOAD_PROXY_PREFIX)) return "";
  const encoded = value.slice(UPLOAD_PROXY_PREFIX.length).trim();
  if (!encoded) return "";

  try {
    return decodeURIComponent(encoded).trim();
  } catch {
    return encoded;
  }
}

function resolveDirectShareUploadPath(value: string) {
  if (!value) return "";
  if (value.startsWith(UPLOAD_PREFIX)) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (
        (parsed.hostname === "cnzhengmu.com" || parsed.hostname === "www.cnzhengmu.com") &&
        parsed.pathname.startsWith(UPLOAD_PREFIX)
      ) {
        return parsed.pathname;
      }
    } catch {
      return "";
    }
  }

  return "";
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

export function resolveUploadedImageShareUrl(input: string | null | undefined): string {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return "";
  }
  if (value.startsWith(UPLOAD_PROXY_PREFIX)) {
    const proxiedSrc = extractUploadSrcFromProxy(value);
    return resolveDirectShareUploadPath(proxiedSrc) || value;
  }
  const directSharePath = resolveDirectShareUploadPath(value);
  if (directSharePath) {
    return directSharePath;
  }
  if (isLegacyUploadUrl(value)) {
    return `${UPLOAD_PROXY_PREFIX}${encodeURIComponent(value)}`;
  }
  if (value.startsWith(UPLOAD_PREFIX)) {
    return `${UPLOAD_PROXY_PREFIX}${encodeURIComponent(value)}`;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return value;
}

export function isUploadedImagePath(input: string | null | undefined): boolean {
  return typeof input === "string" && input.trim().startsWith(UPLOAD_PREFIX);
}
