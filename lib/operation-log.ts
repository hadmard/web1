import { prisma } from "./prisma";

export async function writeOperationLog(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
}) {
  try {
    await prisma.operationLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (e) {
    console.error("writeOperationLog failed:", e);
  }
}
