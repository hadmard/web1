import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function isAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
}

function slugifyBrandName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `brand-${Date.now()}`;
}

async function makeUniqueSlug(baseName: string, enterpriseId: string) {
  const base = slugifyBrandName(baseName);
  let candidate = base;
  let index = 1;

  while (await prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${enterpriseId.slice(0, 6)}${index > 1 ? `-${index}` : ""}`;
    index += 1;
  }

  return candidate;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
          slug: true,
        },
      },
      member: {
        select: {
          name: true,
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  });

  if (!enterprise) {
    return NextResponse.json({ error: "企业不存在" }, { status: 404 });
  }

  if (enterprise.brand) {
    return NextResponse.json({
      ok: true,
      existing: true,
      brandId: enterprise.brand.id,
      brandSlug: enterprise.brand.slug,
      message: "该企业已绑定品牌，已返回现有品牌。",
    });
  }

  const brandName =
    enterprise.companyShortName ||
    enterprise.companyName ||
    enterprise.member?.name ||
    `企业品牌-${enterprise.id.slice(0, 6)}`;

  const slug = await makeUniqueSlug(brandName, enterprise.id);

  try {
    const brand = await prisma.brand.create({
      data: {
        name: brandName,
        slug,
        enterpriseId: enterprise.id,
        logoUrl: enterprise.logoUrl,
        region: enterprise.region,
        area: enterprise.area,
        positioning: enterprise.positioning,
        materialSystem: enterprise.productSystem,
        isBrandVisible: true,
        rankingWeight: enterprise.member?.rankingWeight ?? 0,
        memberTypeSnapshot: enterprise.member?.memberType ?? null,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    revalidatePath("/brands");
    revalidatePath("/brands/all");
    revalidatePath(`/brands/${brand.slug}`);
    revalidatePath(`/enterprise/${enterprise.id}`);

    return NextResponse.json({
      ok: true,
      existing: false,
      brandId: brand.id,
      brandSlug: brand.slug,
      message: "品牌创建并绑定成功。",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingBrand = await prisma.brand.findUnique({
        where: { enterpriseId: enterprise.id },
        select: { id: true, slug: true },
      });

      if (existingBrand) {
        return NextResponse.json({
          ok: true,
          existing: true,
          brandId: existingBrand.id,
          brandSlug: existingBrand.slug,
          message: "该企业已绑定品牌，已返回现有品牌。",
        });
      }
    }

    console.error("POST /api/admin/enterprises/[id]/brand", error);
    return NextResponse.json({ error: "设为品牌失败，请稍后重试" }, { status: 500 });
  }
}
