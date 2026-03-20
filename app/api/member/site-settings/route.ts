import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMemberSiteSettings, normalizeMemberSiteSettings, saveMemberSiteSettings } from "@/lib/member-site-settings";
import { writeOperationLog } from "@/lib/operation-log";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (session.memberType === "personal") {
    return NextResponse.json({ error: "个人会员暂不支持会员站设置" }, { status: 403 });
  }

  const settings = await getMemberSiteSettings(session.sub);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (session.memberType === "personal") {
    return NextResponse.json({ error: "个人会员暂不支持会员站设置" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const settings = normalizeMemberSiteSettings(body);
  await saveMemberSiteSettings(session.sub, settings);

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "member_site_settings_update",
    targetType: "member_site_settings",
    targetId: session.sub,
    detail: JSON.stringify({ memberType: session.memberType }),
  });

  return NextResponse.json({ ok: true, settings });
}
