"use server";

import { revalidatePath } from "next/cache";
import type { ContactType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";

export async function listContactLogs(companyId: string) {
  await requireUser();
  return prisma.contactLog.findMany({
    where: { companyId },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { contactedAt: "desc" },
  });
}

export async function createContactLog(input: {
  companyId: string;
  contactType: ContactType;
  content: string;
  contactedAt?: string;
}) {
  const user = await requireUser();
  const content = input.content.trim();
  if (!content) throw new Error("内容を入力してください");

  const log = await prisma.contactLog.create({
    data: {
      companyId: input.companyId,
      contactType: input.contactType,
      content,
      contactedAt: input.contactedAt ? new Date(input.contactedAt) : new Date(),
      recordedById: user.id,
    },
    include: { recordedBy: { select: { name: true } } },
  });

  await writeAuditLog({
    userId: user.id,
    action: "create",
    entityType: "contact_log",
    entityId: log.id,
    after: log,
  });

  revalidatePath(`/companies/${input.companyId}`);
  return log;
}

export async function deleteContactLog(id: string, companyId: string) {
  const user = await requireUser();
  const before = await prisma.contactLog.findUnique({ where: { id } });
  await prisma.contactLog.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    action: "delete",
    entityType: "contact_log",
    entityId: id,
    before,
  });
  revalidatePath(`/companies/${companyId}`);
}
