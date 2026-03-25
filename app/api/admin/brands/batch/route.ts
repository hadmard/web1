import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { containsSuspiciousText, htmlToPlainText } from "@/lib/brand-content";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function buildBrandWhere(filters: {
  q?: unknown;
  recommend?: unknown;
  quality?: unknown;
}) {
  const q = typeof filters.q === "string" ? filters.q.trim() : "";
  const recommend = typeof filters.recommend === "string" ? filters.recommend : null;
  const quality = typeof filters.quality === "string" ? filters.quality : null;

  const conditions: Record<string, unknown>[] = [];
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
        { tagline: { contains: q } },
        { region: { contains: q } },
        { area: { contains: q } },
        { enterprise: { companyName: { contains: q } } },
        { enterprise: { companyShortName: { contains: q } } },
        { enterprise: { intro: { contains: q } } },
        { enterprise: { positioning: { contains: q } } },
        { enterprise: { productSystem: { contains: q } } },
      ],
    });
  }
  if (recommend === "1" || recommend === "0") {
    conditions.push({ isRecommend: recommend === "1" });
  }
  if (quality === "needs_attention") {
    conditions.push({
      OR: [
        { logoUrl: null },
        { enterprise: { logoUrl: null } },
        { tagline: null },
        { positioning: null },
        { enterprise: { positioning: null } },
        { enterprise: { intro: null } },
        { enterprise: { contactPhone: null } },
      ],
    });
  }
  if (quality === "missing_logo") {
    conditions.push({
      AND: [{ logoUrl: null }, { enterprise: { logoUrl: null } }],
    });
  }
  if (quality === "missing_summary") {
    conditions.push({
      AND: [{ tagline: null }, { positioning: null }, { enterprise: { positioning: null } }, { enterprise: { intro: null } }],
    });
  }
  if (quality === "missing_contact") {
    conditions.push({
      AND: [{ enterprise: { contactPhone: null } }, { enterprise: { website: null } }, { enterprise: { contactInfo: null } }],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function getBrandQualityFlags(input: {
  brandLogoUrl: string | null;
  enterpriseLogoUrl: string | null;
  summarySource: string | null;
  contactPhone: string | null;
  website: string | null;
  contactInfo: string | null;
}) {
  const summaryText = htmlToPlainText(input.summarySource);
  return {
    missingLogo: !(input.enterpriseLogoUrl || input.brandLogoUrl),
    missingSummary: !summaryText,
    missingContact: !(input.contactPhone || input.website || input.contactInfo),
    weakIntro: summaryText.length > 0 && summaryText.length < 36,
    suspiciousIntro: containsSuspiciousText(input.summarySource),
  };
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];
  const patch = typeof body.patch === "object" && body.patch ? (body.patch as Record<string, unknown>) : {};
  const scope = body.scope === "filter" ? "filter" : "page";
  const filters = typeof body.filters === "object" && body.filters ? (body.filters as Record<string, unknown>) : {};

  const data: Record<string, boolean> = {};
  if (typeof patch.isBrandVisible === "boolean") data.isBrandVisible = patch.isBrandVisible;
  if (typeof patch.isRecommend === "boolean") data.isRecommend = patch.isRecommend;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "请提供有效的批量操作内容" }, { status: 400 });
  }

  let targetIds = ids;
  if (scope === "filter") {
    const quality = typeof filters.quality === "string" ? filters.quality : null;
    const requiresPostFilter = quality === "intro_short" || quality === "intro_dirty";
    const matchedBrands = await prisma.brand.findMany({
      where: buildBrandWhere({
        q: filters.q,
        recommend: filters.recommend,
        quality,
      }),
      select: {
        id: true,
        logoUrl: true,
        tagline: true,
        positioning: true,
        enterprise: {
          select: {
            logoUrl: true,
            intro: true,
            positioning: true,
            contactPhone: true,
            website: true,
            contactInfo: true,
          },
        },
      },
      take: 1000,
    });
    targetIds = matchedBrands
      .filter((item) => {
        if (!requiresPostFilter) return true;
        const summarySource = item.enterprise?.positioning || item.enterprise?.intro || item.tagline || item.positioning || null;
        const qualityFlags = getBrandQualityFlags({
          brandLogoUrl: item.logoUrl,
          enterpriseLogoUrl: item.enterprise?.logoUrl ?? null,
          summarySource,
          contactPhone: item.enterprise?.contactPhone ?? null,
          website: item.enterprise?.website ?? null,
          contactInfo: item.enterprise?.contactInfo ?? null,
        });
        if (quality === "intro_short") return qualityFlags.weakIntro;
        if (quality === "intro_dirty") return qualityFlags.suspiciousIntro;
        return true;
      })
      .map((item) => item.id);
  }

  if (targetIds.length === 0) {
    return NextResponse.json(
      { error: scope === "filter" ? "当前筛选结果没有可操作的品牌" : "请选择要批量处理的品牌" },
      { status: 400 },
    );
  }

  const brands = await prisma.brand.findMany({
    where: { id: { in: targetIds } },
    select: {
      id: true,
      slug: true,
      enterpriseId: true,
    },
  });

  await prisma.brand.updateMany({
    where: { id: { in: targetIds } },
    data,
  });

  revalidatePath("/brands");
  revalidatePath("/brands/all");
  for (const brand of brands) {
    if (brand.slug) revalidatePath(`/brands/${brand.slug}`);
    if (brand.enterpriseId) revalidatePath(`/enterprise/${brand.enterpriseId}`);
  }

  return NextResponse.json({
    ok: true,
    count: brands.length,
    patch: data,
    scope,
  });
}
