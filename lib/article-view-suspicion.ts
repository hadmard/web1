const DEFAULT_SUSPICIOUS_WINDOW_HOURS = 24;
const DEFAULT_SUSPICIOUS_UA_DISTINCT_IP_THRESHOLD = 20;
const DEFAULT_SUSPICIOUS_UA_TOTAL_THRESHOLD = 80;
const DEFAULT_SUSPICIOUS_IP_TOTAL_THRESHOLD = 12;
const DEFAULT_KNOWN_UA_DISTINCT_IP_THRESHOLD = 10;
const DEFAULT_KNOWN_UA_TOTAL_THRESHOLD = 30;

const KNOWN_SUSPICIOUS_ANDROID_92_PATTERN =
  /Linux; Android 5\.0; SM-G900P .*Chrome\/92\.0\.4515\.159 Mobile Safari\/537\.36/i;
const KNOWN_SUSPICIOUS_WINDOWS_92_PATTERN =
  /Windows NT 10\.0; Win64; x64.*Chrome\/92\.0\.4515\.159 Safari\/537\.36/i;
const CHROME_92_VERSION_PATTERN = /Chrome\/92\.0\.4515\.159/i;

export type ArticleViewSuspicionStats = {
  uaDistinctIpCount: number;
  uaTotalCount: number;
  ipTotalCount: number;
};

export type ArticleViewSuspicionInput = {
  articleSlug: string;
  userAgent: string;
  referer: string;
  stats: ArticleViewSuspicionStats;
};

export type ArticleViewSuspicionResult = {
  suspicious: boolean;
  reason: string | null;
};

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt((value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSuspiciousWindowHours() {
  return readPositiveInt(process.env.SUSPICIOUS_WINDOW_HOURS, DEFAULT_SUSPICIOUS_WINDOW_HOURS);
}

export function getSuspiciousUaDistinctIpThreshold() {
  return readPositiveInt(
    process.env.SUSPICIOUS_UA_DISTINCT_IP_THRESHOLD,
    DEFAULT_SUSPICIOUS_UA_DISTINCT_IP_THRESHOLD
  );
}

export function getSuspiciousUaTotalThreshold() {
  return readPositiveInt(process.env.SUSPICIOUS_UA_TOTAL_THRESHOLD, DEFAULT_SUSPICIOUS_UA_TOTAL_THRESHOLD);
}

export function getSuspiciousIpTotalThreshold() {
  return readPositiveInt(process.env.SUSPICIOUS_IP_TOTAL_THRESHOLD, DEFAULT_SUSPICIOUS_IP_TOTAL_THRESHOLD);
}

export function getKnownUaDistinctIpThreshold() {
  return readPositiveInt(
    process.env.SUSPICIOUS_KNOWN_UA_DISTINCT_IP_THRESHOLD,
    DEFAULT_KNOWN_UA_DISTINCT_IP_THRESHOLD
  );
}

export function getKnownUaTotalThreshold() {
  return readPositiveInt(process.env.SUSPICIOUS_KNOWN_UA_TOTAL_THRESHOLD, DEFAULT_KNOWN_UA_TOTAL_THRESHOLD);
}

export function isKnownSuspiciousArticleViewUserAgent(userAgent: string) {
  const normalized = (userAgent || "").trim();
  return (
    KNOWN_SUSPICIOUS_ANDROID_92_PATTERN.test(normalized) ||
    KNOWN_SUSPICIOUS_WINDOWS_92_PATTERN.test(normalized)
  );
}

export function isLegacyChrome92ArticleViewUserAgent(userAgent: string) {
  return CHROME_92_VERSION_PATTERN.test((userAgent || "").trim());
}

export function isSelfOrEmptyArticleReferer(referer: string, articleSlug: string) {
  const normalizedReferer = (referer || "").trim();
  if (!normalizedReferer) return true;

  const normalizedSlug = (articleSlug || "").trim();
  if (!normalizedSlug) return false;

  const candidates = [
    `https://cnzhengmu.com/news/${normalizedSlug}`,
    `https://www.cnzhengmu.com/news/${normalizedSlug}`,
    `https://cnzhengmu.com/news/${normalizedSlug}?`,
    `https://www.cnzhengmu.com/news/${normalizedSlug}?`,
  ];

  return candidates.some((candidate) => normalizedReferer === candidate || normalizedReferer.startsWith(candidate));
}

export function shouldSkipArticleViewCountForSuspicion(
  input: ArticleViewSuspicionInput
): ArticleViewSuspicionResult {
  const { articleSlug, userAgent, referer, stats } = input;
  const uaDistinctThreshold = getSuspiciousUaDistinctIpThreshold();
  const uaTotalThreshold = getSuspiciousUaTotalThreshold();
  const ipTotalThreshold = getSuspiciousIpTotalThreshold();
  const knownUaDistinctThreshold = getKnownUaDistinctIpThreshold();
  const knownUaTotalThreshold = getKnownUaTotalThreshold();

  const knownSuspiciousUa = isKnownSuspiciousArticleViewUserAgent(userAgent);
  const legacyChrome92Ua = isLegacyChrome92ArticleViewUserAgent(userAgent);
  const selfOrEmptyReferer = isSelfOrEmptyArticleReferer(referer, articleSlug);
  const proxyPoolPattern =
    stats.uaDistinctIpCount >= uaDistinctThreshold && stats.uaTotalCount >= uaTotalThreshold;
  const elevatedSingleIpPattern = stats.ipTotalCount >= ipTotalThreshold;

  if (knownSuspiciousUa && stats.uaDistinctIpCount >= knownUaDistinctThreshold && stats.uaTotalCount >= knownUaTotalThreshold) {
    return { suspicious: true, reason: "known_ua_proxy_pool" };
  }

  if (proxyPoolPattern && legacyChrome92Ua && selfOrEmptyReferer) {
    return { suspicious: true, reason: "chrome92_proxy_pool" };
  }

  if (proxyPoolPattern && selfOrEmptyReferer && elevatedSingleIpPattern && knownSuspiciousUa) {
    return { suspicious: true, reason: "known_ua_high_ip_pressure" };
  }

  return { suspicious: false, reason: null };
}
