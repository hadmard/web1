import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const IPV4_LOOPBACK_PREFIX = "127.";
const IPV4_LINK_LOCAL_PREFIX = "169.254.";
const IPV4_PRIVATE_PREFIXES = ["10.", "192.168."];
const IPV6_LOOPBACK = "::1";

function parseAllowedHosts(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isAllowedHost(hostname: string, allowedHosts: string[]) {
  const normalized = normalizeHostname(hostname);
  return allowedHosts.some((allowedHost) => {
    const candidate = normalizeHostname(allowedHost);
    return normalized === candidate || normalized.endsWith(`.${candidate}`);
  });
}

function isPrivateIpv4(address: string) {
  if (address.startsWith(IPV4_LOOPBACK_PREFIX)) return true;
  if (address.startsWith(IPV4_LINK_LOCAL_PREFIX)) return true;
  if (IPV4_PRIVATE_PREFIXES.some((prefix) => address.startsWith(prefix))) return true;
  if (address === "0.0.0.0" || address === "169.254.169.254") return true;

  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] >= 224) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  if (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) return true;
  if (octets[0] === 192 && octets[1] === 0 && (octets[2] === 0 || octets[2] === 2)) return true;
  if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) return true;
  if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) return true;
  if (octets[0] === 240) return true;

  return false;
}

function expandIpv6(address: string) {
  const [headRaw, tailRaw = ""] = address.toLowerCase().split("::");
  if (address.split("::").length > 2) return null;

  const head = headRaw ? headRaw.split(":").filter(Boolean) : [];
  const tail = tailRaw ? tailRaw.split(":").filter(Boolean) : [];
  const missing = 8 - (head.length + tail.length);
  if (missing < 0) return null;

  return [...head, ...Array.from({ length: missing }, () => "0"), ...tail].map((segment) =>
    segment.padStart(4, "0"),
  );
}

function isPrivateIpv6(address: string) {
  const normalized = normalizeHostname(address);
  if (normalized === IPV6_LOOPBACK) return true;
  if (normalized === "::" || normalized.startsWith("::ffff:127.")) return true;

  const segments = expandIpv6(normalized);
  if (!segments) return true;

  const first = Number.parseInt(segments[0], 16);
  const second = Number.parseInt(segments[1], 16);
  if (Number.isNaN(first) || Number.isNaN(second)) return true;

  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xff00) === 0xff00) return true;
  if (first === 0x2001 && second === 0x0db8) return true;

  return false;
}

function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

function sanitizedUrlForLog(url: URL) {
  return `${url.origin}${url.pathname}`;
}

export type ValidatedRemoteUrl = {
  url: URL;
  allowedHosts: string[];
};

export function getNewsImportAllowedHosts() {
  return parseAllowedHosts(process.env.NEWS_IMPORT_ALLOWED_HOSTS);
}

export async function validateNewsImportUrl(rawUrl: string): Promise<ValidatedRemoteUrl> {
  const allowedHosts = getNewsImportAllowedHosts();
  if (allowedHosts.length === 0) {
    throw new Error("NEWS_IMPORT_ALLOWED_HOSTS 未配置，已拒绝新闻导入。");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("导入 URL 格式不合法。");
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("导入 URL 仅允许 http/https。");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    throw new Error("导入 URL 缺少主机名。");
  }

  if (!isAllowedHost(hostname, allowedHosts)) {
    throw new Error(`导入域名不在白名单中：${hostname}`);
  }

  if (hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error(`禁止访问本地地址：${hostname}`);
  }

  if (isIP(hostname) !== 0 && isBlockedIp(hostname)) {
    throw new Error(`禁止访问内网或保留地址：${hostname}`);
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (resolved.length === 0) {
    throw new Error(`无法解析导入域名：${hostname}`);
  }

  const blockedAddress = resolved.find((item) => isBlockedIp(item.address));
  if (blockedAddress) {
    throw new Error(`域名解析到了受限地址：${blockedAddress.address}`);
  }

  return { url: parsed, allowedHosts };
}

export function logRejectedNewsImportUrl(rawUrl: string, reason: string) {
  try {
    const parsed = new URL(rawUrl);
    console.warn("[news-import] blocked", {
      url: sanitizedUrlForLog(parsed),
      host: parsed.hostname,
      reason,
    });
  } catch {
    console.warn("[news-import] blocked", { url: "<invalid-url>", reason });
  }
}
