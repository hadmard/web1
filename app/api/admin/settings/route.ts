import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { APP_SETTING_KEYS } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DEFAULT_SITE_VISUAL_SETTINGS, normalizeSiteVisualSettings } from "@/lib/site-visual-config";
import { getDefaultMembershipRules, normalizeMembershipRules } from "@/lib/membership-rules";

function parseBool(raw: string | null | undefined, fallback: boolean) {
  if (raw == null) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主管理员权限" }, { status: 403 });
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            APP_SETTING_KEYS.GEMINI_API_KEY,
            APP_SETTING_KEYS.CONTENT_REVIEW_REQUIRED,
            APP_SETTING_KEYS.MEMBER_DOWNLOAD_STANDARD_ENABLED,
            APP_SETTING_KEYS.MEMBER_DOWNLOAD_REPORT_ENABLED,
            APP_SETTING_KEYS.SITE_VISUAL_SETTINGS,
            APP_SETTING_KEYS.MEMBERSHIP_RULES,
          ],
        },
      },
    });

    const map = new Map(rows.map((r) => [r.key, r.value]));

    return NextResponse.json({
      hasGeminiApiKey: !!map.get(APP_SETTING_KEYS.GEMINI_API_KEY),
      contentReviewRequired: parseBool(map.get(APP_SETTING_KEYS.CONTENT_REVIEW_REQUIRED), true),
      memberDownloadStandardEnabled: parseBool(map.get(APP_SETTING_KEYS.MEMBER_DOWNLOAD_STANDARD_ENABLED), true),
      memberDownloadReportEnabled: parseBool(map.get(APP_SETTING_KEYS.MEMBER_DOWNLOAD_REPORT_ENABLED), true),
      membershipRules: (() => {
        const raw = map.get(APP_SETTING_KEYS.MEMBERSHIP_RULES);
        if (!raw) return getDefaultMembershipRules();
        try {
          return normalizeMembershipRules(JSON.parse(raw));
        } catch {
          return getDefaultMembershipRules();
        }
      })(),
      siteVisualSettings: (() => {
        const raw = map.get(APP_SETTING_KEYS.SITE_VISUAL_SETTINGS);
        if (!raw) return DEFAULT_SITE_VISUAL_SETTINGS;
        try {
          return normalizeSiteVisualSettings(JSON.parse(raw));
        } catch {
          return DEFAULT_SITE_VISUAL_SETTINGS;
        }
      })(),
    });
  } catch (e) {
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "读取设置失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "需要主管理员权限" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const updates: Array<{ key: string; value: string }> = [];

    if (typeof body.geminiApiKey === "string") {
      const value = body.geminiApiKey.trim();
      if (!value) {
        return NextResponse.json({ error: "请输入 Gemini API Key" }, { status: 400 });
      }
      updates.push({ key: APP_SETTING_KEYS.GEMINI_API_KEY, value });
    }

    if (typeof body.memberDownloadStandardEnabled === "boolean") {
      updates.push({
        key: APP_SETTING_KEYS.MEMBER_DOWNLOAD_STANDARD_ENABLED,
        value: body.memberDownloadStandardEnabled ? "true" : "false",
      });
    }

    if (typeof body.contentReviewRequired === "boolean") {
      updates.push({
        key: APP_SETTING_KEYS.CONTENT_REVIEW_REQUIRED,
        value: body.contentReviewRequired ? "true" : "false",
      });
    }

    if (typeof body.memberDownloadReportEnabled === "boolean") {
      updates.push({
        key: APP_SETTING_KEYS.MEMBER_DOWNLOAD_REPORT_ENABLED,
        value: body.memberDownloadReportEnabled ? "true" : "false",
      });
    }

    if (body.siteVisualSettings && typeof body.siteVisualSettings === "object") {
      updates.push({
        key: APP_SETTING_KEYS.SITE_VISUAL_SETTINGS,
        value: JSON.stringify(normalizeSiteVisualSettings(body.siteVisualSettings)),
      });
    }

    if (body.membershipRules && typeof body.membershipRules === "object") {
      updates.push({
        key: APP_SETTING_KEYS.MEMBERSHIP_RULES,
        value: JSON.stringify(normalizeMembershipRules(body.membershipRules)),
      });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "请提供要更新的设置项" }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.appSetting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        })
      )
    );

    if (updates.some((u) => u.key === APP_SETTING_KEYS.SITE_VISUAL_SETTINGS)) {
      revalidateTag("site-visual-settings");
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "保存失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
