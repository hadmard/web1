import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { writeOperationLog } from "@/lib/operation-log";

function trimRequired(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

function trimOptional(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function normalizeAttachments(input: unknown) {
  if (!Array.isArray(input)) return null;
  const items = input
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
  return items.length > 0 ? JSON.stringify(items) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const [latest, enterprise] = await Promise.all([
    prisma.enterpriseVerification.findFirst({
      where: { memberId: session.sub },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enterprise.findUnique({
      where: { memberId: session.sub },
      select: {
        id: true,
        companyName: true,
        companyShortName: true,
        verificationStatus: true,
        verifiedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ latest, enterprise });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  let payload: {
    companyName: string;
    companyShortName: string | null;
    accountName: string;
    accountPassword: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string | null;
    logoUrl: string | null;
    licenseImageUrl: string;
    licenseCode: string;
    address: string;
    foundedAt: string | null;
    registeredCapital: string | null;
    website: string | null;
    intro: string | null;
    businessScope: string | null;
    productSystem: string | null;
    coreAdvantages: string | null;
    attachmentsJson: string | null;
  };

  try {
    payload = {
      companyName: trimRequired(body.companyName, "企业全称"),
      companyShortName: trimOptional(body.companyShortName),
      accountName: trimRequired(body.accountName, "企业账号"),
      accountPassword: trimRequired(body.accountPassword, "企业账号密码"),
      contactPerson: trimRequired(body.contactPerson, "联系人"),
      contactPhone: trimRequired(body.contactPhone, "联系电话"),
      contactEmail: trimOptional(body.contactEmail),
      logoUrl: trimOptional(body.logoUrl),
      licenseImageUrl: trimRequired(body.licenseImageUrl, "营业执照图片"),
      licenseCode: trimRequired(body.licenseCode, "统一社会信用代码"),
      address: trimRequired(body.address, "企业地址"),
      foundedAt: trimOptional(body.foundedAt),
      registeredCapital: trimOptional(body.registeredCapital),
      website: trimOptional(body.website),
      intro: trimOptional(body.intro),
      businessScope: trimOptional(body.businessScope),
      productSystem: trimOptional(body.productSystem),
      coreAdvantages: trimOptional(body.coreAdvantages),
      attachmentsJson: normalizeAttachments(body.attachments),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "参数错误";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existingPending = await prisma.enterpriseVerification.findFirst({
    where: { memberId: session.sub, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const saved = existingPending
    ? await prisma.enterpriseVerification.update({
        where: { id: existingPending.id },
        data: {
          ...payload,
          status: "pending",
          reviewNote: null,
          reviewedAt: null,
          reviewedById: null,
        },
      })
    : await prisma.enterpriseVerification.create({
        data: {
          memberId: session.sub,
          ...payload,
        },
      });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "enterprise_verification_submit",
    targetType: "enterprise_verification",
    targetId: saved.id,
    detail: JSON.stringify({ status: saved.status }),
  });

  return NextResponse.json(saved);
}
