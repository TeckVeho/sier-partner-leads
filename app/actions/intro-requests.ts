"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { createIntroRequest } from "@/lib/intro/generate";
import { requireLlmConfigured } from "@/lib/llm/config";
import { sendSlackMessage } from "@/lib/slack/client";

export async function listIntroRequests(status?: "draft" | "approved" | "sent") {
  await requireUser();
  return prisma.introRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          prefecture: true,
          city: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        },
      },
      viaPartner: { select: { id: true, name: true } },
      viaNode: { select: { id: true, name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function generateIntroRequest(companyId: string, viaPartnerId: string, viaNodeId: string) {
  const user = await requireUser();
  await requireLlmConfigured();
  const existing = await prisma.introRequest.findFirst({
    where: { companyId, status: { in: ["draft", "approved"] } },
  });
  if (existing) throw new Error("既に依頼下書きがあります");

  const request = await createIntroRequest({ companyId, viaPartnerId, viaNodeId });
  const source = request.draftBody.startsWith("【AI下書き") ? "llm" : "template";
  await writeAuditLog({
    userId: user.id,
    action: "create",
    entityType: "intro_request",
    entityId: request.id,
    after: { ...request, source },
  });
  revalidatePath("/intro-requests");
  revalidatePath(`/companies/${companyId}`);
  return request;
}

export async function updateIntroDraft(id: string, draftBody: string) {
  const user = await requireUser();
  const before = await prisma.introRequest.findUnique({ where: { id } });
  const updated = await prisma.introRequest.update({
    where: { id },
    data: { draftBody },
  });
  await writeAuditLog({
    userId: user.id,
    action: "update",
    entityType: "intro_request",
    entityId: id,
    before,
    after: updated,
  });
  revalidatePath("/intro-requests");
  return updated;
}

export async function approveIntroRequest(id: string) {
  const user = await requireUser({ adminOnly: true });
  const before = await prisma.introRequest.findUnique({ where: { id } });
  const updated = await prisma.introRequest.update({
    where: { id },
    data: {
      status: "approved",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "approve",
    entityType: "intro_request",
    entityId: id,
    before,
    after: updated,
  });
  revalidatePath("/intro-requests");
  return updated;
}

export async function markIntroSent(id: string) {
  const user = await requireUser();
  const before = await prisma.introRequest.findUnique({
    where: { id },
    include: { company: true, viaPartner: true },
  });
  const updated = await prisma.introRequest.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
  await prisma.pipelineEvent.create({
    data: {
      companyId: updated.companyId,
      stage: "requested",
      note: "紹介依頼を送信済みとして記録",
      recordedById: user.id,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "mark_sent",
    entityType: "intro_request",
    entityId: id,
    before,
    after: updated,
  });
  revalidatePath("/intro-requests");
  revalidatePath("/pipeline");
  return updated;
}

export async function notifyPendingIntro(id: string) {
  await requireUser({ adminOnly: true });
  const request = await prisma.introRequest.findUnique({
    where: { id },
    include: {
      company: {
        include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
      },
    },
  });
  if (!request) throw new Error("Not found");
  await sendSlackMessage(
    `:bell: 承認待ちの紹介依頼\n${request.company.name} / 優先度 ${request.company.scores[0]?.priority ?? "—"}`,
  );
}
