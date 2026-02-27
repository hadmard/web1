import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { writeOperationLog } from "@/lib/operation-log";

function isSuperAdmin(role: string | null | undefined) {
  return role === "SUPER_ADMIN";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "仅主管理员可审核" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action 仅支持 approve/reject" }, { status: 400 });
  }

  const current = await prisma.enterpriseVerification.findUnique({
    where: { id },
  });

  if (!current) {
    return NextResponse.json({ error: "认证申请不存在" }, { status: 404 });
  }
  if (current.status !== "pending") {
    return NextResponse.json({ error: "该申请已处理" }, { status: 400 });
  }

  if (action === "reject") {
    const rejected = await prisma.enterpriseVerification.update({
      where: { id },
      data: {
        status: "rejected",
        reviewNote: reviewNote || "资质信息不完整或不符合要求",
        reviewedAt: new Date(),
        reviewedById: session.sub,
      },
    });

    await writeOperationLog({
      actorId: session.sub,
      actorEmail: session.email,
      action: "enterprise_verification_reject",
      targetType: "enterprise_verification",
      targetId: rejected.id,
      detail: JSON.stringify({ reviewNote: rejected.reviewNote }),
    });

    return NextResponse.json(rejected);
  }

  const approved = await prisma.$transaction(async (tx) => {
    const enterprise = await tx.enterprise.upsert({
      where: { memberId: current.memberId },
      create: {
        memberId: current.memberId,
        companyName: current.companyName,
        companyShortName: current.companyShortName,
        contactPerson: current.contactPerson,
        contactPhone: current.contactPhone,
        contactInfo: current.contactEmail,
        website: current.website,
        address: current.address,
        licenseCode: current.licenseCode,
        foundedAt: current.foundedAt,
        registeredCapital: current.registeredCapital,
        intro: current.intro,
        logoUrl: current.logoUrl,
        productSystem: current.productSystem,
        positioning: current.coreAdvantages,
        certifications: current.businessScope,
        verificationStatus: "approved",
        verifiedAt: new Date(),
        sourceVerificationId: current.id,
      },
      update: {
        companyName: current.companyName,
        companyShortName: current.companyShortName,
        contactPerson: current.contactPerson,
        contactPhone: current.contactPhone,
        contactInfo: current.contactEmail,
        website: current.website,
        address: current.address,
        licenseCode: current.licenseCode,
        foundedAt: current.foundedAt,
        registeredCapital: current.registeredCapital,
        intro: current.intro,
        logoUrl: current.logoUrl,
        productSystem: current.productSystem,
        positioning: current.coreAdvantages,
        certifications: current.businessScope,
        verificationStatus: "approved",
        verifiedAt: new Date(),
        sourceVerificationId: current.id,
      },
      select: { id: true },
    });

    await tx.enterpriseVerification.update({
      where: { id: current.id },
      data: {
        status: "approved",
        reviewNote: reviewNote || "审核通过",
        reviewedAt: new Date(),
        reviewedById: session.sub,
        approvedEnterpriseId: enterprise.id,
      },
    });

    const member = await tx.member.findUnique({
      where: { id: current.memberId },
      select: { memberType: true, name: true },
    });

    if (member) {
      const patch: { memberType?: string; name?: string } = {};
      if (member.memberType === "personal") patch.memberType = "enterprise_basic";
      if (!member.name || !member.name.trim()) patch.name = current.companyShortName || current.companyName;
      if (Object.keys(patch).length > 0) {
        await tx.member.update({ where: { id: current.memberId }, data: patch });
      }
    }

    return enterprise;
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "enterprise_verification_approve",
    targetType: "enterprise_verification",
    targetId: current.id,
    detail: JSON.stringify({ enterpriseId: approved.id }),
  });

  return NextResponse.json({ ok: true, enterpriseId: approved.id });
}
