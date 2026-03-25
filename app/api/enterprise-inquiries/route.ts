import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

function asText(value: unknown, maxLength: number, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const normalized = value.trim();
  if (!normalized) return required ? null : "";
  return normalized.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const enterpriseId = asText(body.enterpriseId, 64, true);
  const visitorName = asText(body.visitorName, 60, true);
  const phone = asText(body.phone, 32, true);
  const demand = asText(body.demand, 1200, true);
  const city = asText(body.city, 80);
  const wechat = asText(body.wechat, 80);
  const company = asText(body.company, 120);
  const sourcePage = asText(body.sourcePage, 255);

  if (!enterpriseId) {
    return NextResponse.json({ error: "企业信息缺失，请重新进入咨询页提交" }, { status: 400 });
  }
  if (!visitorName) {
    return NextResponse.json({ error: "请填写联系人姓名" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "请填写联系电话" }, { status: 400 });
  }
  if (!demand) {
    return NextResponse.json({ error: "请填写需求内容" }, { status: 400 });
  }

  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    select: {
      id: true,
      companyName: true,
      companyShortName: true,
    },
  });

  if (!enterprise) {
    return NextResponse.json({ error: "未找到对应企业" }, { status: 404 });
  }

  const inquiry = await prisma.enterpriseInquiry.create({
    data: {
      enterpriseId: enterprise.id,
      visitorName,
      phone,
      city: city || null,
      wechat: wechat || null,
      company: company || null,
      demand,
      sourcePage: sourcePage || null,
    },
  });

  await writeOperationLog({
    action: "enterprise_inquiry_submit",
    targetType: "enterprise_inquiry",
    targetId: inquiry.id,
    detail: JSON.stringify({
      enterpriseId: enterprise.id,
      enterpriseName: enterprise.companyShortName || enterprise.companyName || enterprise.id,
    }),
  });

  return NextResponse.json({
    ok: true,
    inquiryId: inquiry.id,
    message: "需求已提交，企业会尽快查看并与你联系。",
  });
}
