import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before as object | undefined,
      after: input.after as object | undefined,
    },
  });
}
