import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";
import { revalidatePath } from "next/cache";

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
    intro: trimOrNull(body.intro),
    logoUrl: trimOrNull(body.logoUrl),
    region: trimOrNull(body.region),
    area: trimOrNull(body.area),
    contactInfo: trimOrNull(body.contactInfo),
    contactPhone: trimOrNull(body.contactPhone),
  };

  const advancedData =
    session.memberType === "enterprise_advanced"
      ? {
          positioning: trimOrNull(body.positioning),
          productSystem: trimOrNull(body.productSystem),
          craftLevel: trimOrNull(body.craftLevel),
          certifications: trimOrNull(body.certifications),
          awards: trimOrNull(body.awards),
          relatedStandards: trimOrNull(body.relatedStandards),
          relatedTerms: trimOrNull(body.relatedTerms),
          relatedBrands: trimOrNull(body.relatedBrands),
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

  return NextResponse.json(enterprise);
}
