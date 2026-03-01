import { prisma } from "@/lib/prisma";
import { APP_SETTING_KEYS } from "@/lib/app-settings";
import { DEFAULT_SITE_VISUAL_SETTINGS, normalizeSiteVisualSettings, type SiteVisualSettings } from "@/lib/site-visual-config";

export async function getSiteVisualSettings(): Promise<SiteVisualSettings> {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: APP_SETTING_KEYS.SITE_VISUAL_SETTINGS },
      select: { value: true },
    });
    if (!row?.value) return DEFAULT_SITE_VISUAL_SETTINGS;
    const parsed = JSON.parse(row.value);
    return normalizeSiteVisualSettings(parsed);
  } catch {
    return DEFAULT_SITE_VISUAL_SETTINGS;
  }
}
