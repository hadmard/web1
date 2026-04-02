import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { normalizePlainTextField, normalizeRichTextField, toSummaryText } from "@/lib/brand-content";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function trimUrl(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const enterprise = await prisma.enterprise.findUnique({
    where: { id },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          isBrandVisible: true,
          isRecommend: true,
          sortOrder: true,
        },
      },
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  });

  if (!enterprise) {
    return NextResponse.json({ error: "企业不存在" }, { status: 404 });
  }

  return NextResponse.json({
    ...enterprise,
    frontDisplay: {
      name: enterprise.companyShortName || enterprise.companyName || enterprise.member.name || "企业",
      summary: toSummaryText(enterprise.positioning || enterprise.intro, 120),
      detailHref: `/enterprise/${enterprise.id}`,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data = {
    companyName: normalizePlainTextField(body.companyName),
    companyShortName: normalizePlainTextField(body.companyShortName),
    intro: normalizeRichTextField(body.intro),
    logoUrl: trimUrl(body.logoUrl),
    region: normalizePlainTextField(body.region),
    area: normalizePlainTextField(body.area),
    positioning: normalizePlainTextField(body.positioning),
    contactPerson: normalizePlainTextField(body.contactPerson),
    contactPhone: normalizePlainTextField(body.contactPhone),
    contactInfo: normalizePlainTextField(body.contactInfo),
    website: trimUrl(body.website),
    address: normalizePlainTextField(body.address),
    productSystem: normalizePlainTextField(body.productSystem),
    craftLevel: normalizePlainTextField(body.craftLevel),
    certifications: normalizePlainTextField(body.certifications),
    awards: normalizePlainTextField(body.awards),
  };

  const enterprise = await prisma.enterprise.update({
    where: { id },
    data,
    include: {
      brand: {
        select: {
          slug: true,
          isBrandVisible: true,
        },
      },
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  revalidatePath(`/enterprise/${enterprise.id}`);
  revalidatePath("/brands");
  revalidatePath("/brands/all");
  if (enterprise.brand?.slug) {
    revalidatePath(`/brands/${enterprise.brand.slug}`);
  }

  return NextResponse.json({
    enterprise,
    frontDisplay: {
      name: enterprise.companyShortName || enterprise.companyName || enterprise.member.name,
      summary: toSummaryText(enterprise.positioning || enterprise.intro, 120),
      detailHref: `/enterprise/${enterprise.id}`,
    },
  });
}
