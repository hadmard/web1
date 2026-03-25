import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";
import { revalidatePath } from "next/cache";
import { normalizePlainTextField, normalizeRichTextField, toSummaryText } from "@/lib/brand-content";

function trimOrNull(v: unknown) {
  return typeof v === "string" ? v.trim() || null : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [member, enterprise] = await Promise.all([
    prisma.member.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        memberType: true,
        rankingWeight: true,
        memberTypeExpiresAt: true,
      },
    }),
    prisma.enterprise.findUnique({ where: { memberId: session.sub } }),
  ]);

  return NextResponse.json({ member, enterprise });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (session.memberType === "personal") {
    return NextResponse.json({ error: "个人会员不支持企业资料编辑" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  const baseData = {
    intro: normalizeRichTextField(body.intro),
    logoUrl: trimOrNull(body.logoUrl),
    region: normalizePlainTextField(body.region),
    area: normalizePlainTextField(body.area),
    contactInfo: normalizePlainTextField(body.contactInfo),
    contactPhone: normalizePlainTextField(body.contactPhone),
  };

  const advancedData =
    session.memberType === "enterprise_advanced"
      ? {
          positioning: normalizePlainTextField(body.positioning),
          productSystem: normalizePlainTextField(body.productSystem),
          craftLevel: normalizePlainTextField(body.craftLevel),
          certifications: normalizePlainTextField(body.certifications),
          awards: normalizePlainTextField(body.awards),
          relatedStandards: normalizePlainTextField(body.relatedStandards),
          relatedTerms: normalizePlainTextField(body.relatedTerms),
          relatedBrands: normalizePlainTextField(body.relatedBrands),
          videoUrl: trimOrNull(body.videoUrl),
        }
      : {};

  const data = { ...baseData, ...advancedData };

  const enterprise = await prisma.enterprise.upsert({
    where: { memberId: session.sub },
    create: { memberId: session.sub, ...data },
    update: data,
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_profile_update",
    targetType: "enterprise",
    targetId: enterprise.id,
    detail: JSON.stringify({ memberType: session.memberType }),
  });

  revalidatePath(`/enterprise/${enterprise.id}`);
  revalidatePath("/brands");
  revalidatePath("/brands/all");

  return NextResponse.json({
    ...enterprise,
    frontDisplay: {
      name: enterprise.companyShortName || enterprise.companyName || session.name,
      region: enterprise.region || "全国",
      summary: toSummaryText(enterprise.positioning || enterprise.intro, 120),
      detailHref: `/enterprise/${enterprise.id}`,
    },
  });
}
