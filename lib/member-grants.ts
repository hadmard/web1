import { prisma } from "@/lib/prisma";
import { MEMBER_PUBLISH_CATEGORY_OPTIONS } from "@/lib/content-taxonomy";

export type GrantFeatureKey =
  | "enterpriseSite"
  | "seo"
  | "recommendContent"
  | "galleryUpload"
  | "standardFeedback"
  | "dictionaryContribution"
  | "standardCoBuild"
  | "subAccounts";

export type GrantOverride<T> = T | null;

export type SubcategoryGrant = {
  enabled: GrantOverride<boolean>;
  annualLimit: GrantOverride<number>;
};

export type CategoryGrant = {
  enabled: GrantOverride<boolean>;
  annualLimit: GrantOverride<number>;
  subcategories: Record<string, SubcategoryGrant>;
};

export type MemberGrantSettings = {
  year: number;
  activeFrom: string | null;
  activeUntil: string | null;
  features: Record<GrantFeatureKey, GrantOverride<boolean>>;
  categories: Record<string, CategoryGrant>;
};

function buildKey(memberId: string) {
  return `member_permission_grants:${memberId}`;
}

function normalizeNullableBool(value: unknown): GrantOverride<boolean> {
  if (value == null) return null;
  return typeof value === "boolean" ? value : null;
}

function normalizeNullableNumber(value: unknown): GrantOverride<number> {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed < 0 ? 0 : parsed;
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateOnly(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateOnly(date);
}

function defaultCategories() {
  return Object.fromEntries(
    MEMBER_PUBLISH_CATEGORY_OPTIONS.map((category) => [
      category.href,
      {
        enabled: null,
        annualLimit: null,
        subcategories: Object.fromEntries(
          category.subs.map((sub) => [
            sub.href,
            {
              enabled: null,
              annualLimit: null,
            } satisfies SubcategoryGrant,
          ])
        ),
      } satisfies CategoryGrant,
    ])
  ) as Record<string, CategoryGrant>;
}

export function getDefaultMemberGrantSettings(year = new Date().getFullYear()): MemberGrantSettings {
  return {
    year,
    activeFrom: `${year}-01-01`,
    activeUntil: `${year}-12-31`,
    features: {
      enterpriseSite: null,
      seo: null,
      recommendContent: null,
      galleryUpload: null,
      standardFeedback: null,
      dictionaryContribution: null,
      standardCoBuild: null,
      subAccounts: null,
    },
    categories: defaultCategories(),
  };
}

export function normalizeMemberGrantSettings(value: unknown): MemberGrantSettings {
  const fallback = getDefaultMemberGrantSettings();
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const categorySource =
    source.categories && typeof source.categories === "object"
      ? (source.categories as Record<string, unknown>)
      : {};
  const featureSource =
    source.features && typeof source.features === "object"
      ? (source.features as Record<string, unknown>)
      : {};

  const categories = defaultCategories();
  for (const category of MEMBER_PUBLISH_CATEGORY_OPTIONS) {
    const rawCategory =
      categorySource[category.href] && typeof categorySource[category.href] === "object"
        ? (categorySource[category.href] as Record<string, unknown>)
        : {};
    const rawSubcategories =
      rawCategory.subcategories && typeof rawCategory.subcategories === "object"
        ? (rawCategory.subcategories as Record<string, unknown>)
        : {};

    categories[category.href] = {
      enabled: normalizeNullableBool(rawCategory.enabled),
      annualLimit: normalizeNullableNumber(rawCategory.annualLimit),
      subcategories: Object.fromEntries(
        category.subs.map((sub) => {
          const rawSub =
            rawSubcategories[sub.href] && typeof rawSubcategories[sub.href] === "object"
              ? (rawSubcategories[sub.href] as Record<string, unknown>)
              : {};
          return [
            sub.href,
            {
              enabled: normalizeNullableBool(rawSub.enabled),
              annualLimit: normalizeNullableNumber(rawSub.annualLimit),
            } satisfies SubcategoryGrant,
          ];
        })
      ),
    };
  }

  const normalizedYear =
    typeof source.year === "number" && Number.isFinite(source.year)
      ? Math.max(2024, Math.floor(source.year))
      : fallback.year;
  const activeFrom = normalizeDateOnly(source.activeFrom) ?? `${normalizedYear}-01-01`;
  const activeUntil = normalizeDateOnly(source.activeUntil) ?? `${normalizedYear}-12-31`;
  const orderedRange =
    new Date(`${activeFrom}T00:00:00.000Z`).getTime() <= new Date(`${activeUntil}T00:00:00.000Z`).getTime()
      ? { activeFrom, activeUntil }
      : { activeFrom: activeUntil, activeUntil: activeFrom };

  return {
    year: normalizedYear,
    activeFrom: orderedRange.activeFrom,
    activeUntil: orderedRange.activeUntil,
    features: {
      enterpriseSite: normalizeNullableBool(featureSource.enterpriseSite),
      seo: normalizeNullableBool(featureSource.seo),
      recommendContent: normalizeNullableBool(featureSource.recommendContent),
      galleryUpload: normalizeNullableBool(featureSource.galleryUpload),
      standardFeedback: normalizeNullableBool(featureSource.standardFeedback),
      dictionaryContribution: normalizeNullableBool(featureSource.dictionaryContribution),
      standardCoBuild: normalizeNullableBool(featureSource.standardCoBuild),
      subAccounts: normalizeNullableBool(featureSource.subAccounts),
    },
    categories,
  };
}

export async function getMemberGrantSettings(memberId: string): Promise<MemberGrantSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: buildKey(memberId) },
    select: { value: true },
  });

  if (!row?.value) {
    return getDefaultMemberGrantSettings();
  }

  try {
    return normalizeMemberGrantSettings(JSON.parse(row.value));
  } catch {
    return getDefaultMemberGrantSettings();
  }
}

export async function saveMemberGrantSettings(memberId: string, settings: MemberGrantSettings) {
  const normalized = normalizeMemberGrantSettings(settings);
  return prisma.appSetting.upsert({
    where: { key: buildKey(memberId) },
    update: { value: JSON.stringify(normalized) },
    create: { key: buildKey(memberId), value: JSON.stringify(normalized) },
  });
}
