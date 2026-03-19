import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

export const SHARE_CACHE_VERSION = "mobile-share-20260318-3";

export function buildNewsPath(segment: string) {
  return `/news/${encodeURIComponent(segment)}`;
}

export function buildPublicNewsUrl(segment: string) {
  return `${PUBLIC_SITE_URL}${buildNewsPath(segment)}`;
}

export function buildNewsShareEntryUrl(segment: string) {
  const url = new URL(`${PUBLIC_SITE_URL}/share/news/${encodeURIComponent(segment)}`);
  url.searchParams.set("sharev", SHARE_CACHE_VERSION);
  return url.toString();
}
