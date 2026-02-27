import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeOperationLog } from "@/lib/operation-log";

function isSuperAdmin(session: { role: string | null } | null) {
  return session?.role === "SUPER_ADMIN";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "仅主管理员可审核" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status } = body;

  if (typeof status !== "string" || !["draft", "pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "状态非法" }, { status: 400 });
  }

  const updated = await prisma.standardFeedback.update({
    where: { id },
    data: { status },
  });

  await writeOperationLog({
    actorId: session.sub,
    actorEmail: session.email,
    action: "standard_feedback_review_status_change",
    targetType: "standard_feedback",
    targetId: id,
    detail: JSON.stringify({ status }),
  });

  return NextResponse.json(updated);
}
