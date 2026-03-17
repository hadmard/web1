const UPLOAD_PREFIX = "/uploads/";
const UPLOAD_PROXY_PREFIX = "/api/upload/image?src=";

export function resolveUploadedImageUrl(input: string | null | undefined): string {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "";
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith(UPLOAD_PROXY_PREFIX)
  ) {
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
