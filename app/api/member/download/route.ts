import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMemberDownloadSwitches } from "@/lib/app-settings";
import { canDownloadReport, canDownloadStandard } from "@/lib/member-access";
import { writeOperationLog } from "@/lib/operation-log";

type ResourceType = "standard" | "report";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const resourceType = body.resourceType as ResourceType | undefined;
  const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";

  if (resourceType !== "standard" && resourceType !== "report") {
    return NextResponse.json({ error: "资源类型非法" }, { status: 400 });
  }
  if (!resourceId) {
    return NextResponse.json({ error: "资源 ID 不能为空" }, { status: 400 });
  }

  const switches = await getMemberDownloadSwitches();
  const allowed =
    resourceType === "standard"
      ? canDownloadStandard(session.memberType, switches.standardEnabled)
      : canDownloadReport(session.memberType, switches.reportEnabled);

  if (!allowed) {
    return NextResponse.json({ error: "当前会员等级或系统设置不允许下载" }, { status: 403 });
  }

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: resourceType === "standard" ? "standard_download_request" : "report_download_request",
    targetType: resourceType,
    targetId: resourceId,
    detail: JSON.stringify({ memberType: session.memberType }),
  });

  return NextResponse.json({
    ok: true,
    message: "下载权限校验通过，文件下载通道可按现有存储方案继续接入。",
  });
}
