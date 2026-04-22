import { prisma } from "@/lib/prisma";

export const APP_SETTING_KEYS = {
  GEMINI_API_KEY: "gemini_api_key",
  CONTENT_REVIEW_REQUIRED: "content_review_required",
  MEMBER_DOWNLOAD_STANDARD_ENABLED: "member_download_standard_enabled",
  MEMBER_DOWNLOAD_REPORT_ENABLED: "member_download_report_enabled",
  SITE_VISUAL_SETTINGS: "site_visual_settings",
  MEMBERSHIP_RULES: "membership_rules",
  NEWS_AFTERMARKET_CONFIG: "news_aftermarket_config",
} as const;

function parseBool(raw: string | null | undefined, fallback: boolean) {
  if (raw == null) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

export async function getMemberDownloadSwitches() {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          APP_SETTING_KEYS.MEMBER_DOWNLOAD_STANDARD_ENABLED,
          APP_SETTING_KEYS.MEMBER_DOWNLOAD_REPORT_ENABLED,
        ],
      },
    },
  });

  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    standardEnabled: parseBool(map.get(APP_SETTING_KEYS.MEMBER_DOWNLOAD_STANDARD_ENABLED), true),
    reportEnabled: parseBool(map.get(APP_SETTING_KEYS.MEMBER_DOWNLOAD_REPORT_ENABLED), true),
  };
}

export async function isContentReviewRequired() {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEYS.CONTENT_REVIEW_REQUIRED },
  });
  return parseBool(row?.value, true);
}
