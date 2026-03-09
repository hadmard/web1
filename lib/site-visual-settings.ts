import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APP_SETTING_KEYS } from "@/lib/app-settings";
import { DEFAULT_SITE_VISUAL_SETTINGS, normalizeSiteVisualSettings, type SiteVisualSettings } from "@/lib/site-visual-config";

const getCachedSiteVisualSettings = unstable_cache(
  async (): Promise<SiteVisualSettings> => {
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
  },
  ["site-visual-settings"],
  {
    revalidate: 300,
    tags: ["site-visual-settings"],
  }
);

export async function getSiteVisualSettings(): Promise<SiteVisualSettings> {
  try {
    return await getCachedSiteVisualSettings();
  } catch {
    return DEFAULT_SITE_VISUAL_SETTINGS;
  }
}
