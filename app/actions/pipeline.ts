"use server";

import { revalidatePath } from "next/cache";
import type { PipelineStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";

export async function listPipelineBoard() {
  await requireUser();
  const companies = await prisma.company.findMany({
    where: { status: "candidate" },
    include: {
      scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
      pipelineEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    prefecture: company.prefecture,
    priority: company.scores[0]?.priority ?? "hold",
    stage: company.pipelineEvents[0]?.stage ?? ("not_contacted" as PipelineStage),
    lostReason: company.pipelineEvents[0]?.lostReason ?? null,
  }));
}

export async function movePipelineStage(input: {
  companyId: string;
  stage: PipelineStage;
  lostReason?: string;
  note?: string;
}) {
  const user = await requireUser();
  if (input.stage === "lost" && !input.lostReason?.trim()) {
    throw new Error("見送り理由は必須です");
  }

  const event = await prisma.pipelineEvent.create({
    data: {
      companyId: input.companyId,
      stage: input.stage,
      lostReason: input.lostReason?.trim() || null,
      note: input.note?.trim() || null,
      recordedById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "pipeline_move",
    entityType: "company",
    entityId: input.companyId,
    after: event,
  });

  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  return event;
}

export async function listStalledCompanies(days = 14) {
  await requireUser();
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const companies = await prisma.company.findMany({
    where: { status: "candidate" },
    include: {
      pipelineEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
      introRequests: { where: { status: { in: ["approved", "sent"] } }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  return companies.filter((company) => {
    const last = company.pipelineEvents[0]?.occurredAt ?? company.discoveredAt;
    return last < threshold;
  });
}
