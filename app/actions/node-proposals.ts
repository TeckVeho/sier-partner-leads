"use server";

import { revalidatePath } from "next/cache";
import type { NodeType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { startJob } from "@/app/actions/jobs";
import { requireLlmConfigured } from "@/lib/llm/config";

export async function listNodeProposals(status: "pending" | "accepted" | "rejected" | "all" = "pending") {
  await requireUser({ adminOnly: true });
  return prisma.nodeProposal.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: { id: true, name: true, prefecture: true } },
      matchedNode: { select: { id: true, name: true } },
      acceptedNode: { select: { id: true, name: true } },
    },
    take: 80,
  });
}

export async function startNodeDiscovery(partnerId?: string) {
  await requireLlmConfigured();
  return startJob("node_discovery", partnerId ? { partnerId } : {});
}

export async function acceptNodeProposal(input: {
  id: string;
  name?: string;
  nodeType?: NodeType;
  rosterUrl?: string | null;
}) {
  const user = await requireUser({ adminOnly: true });
  const proposal = await prisma.nodeProposal.findUnique({ where: { id: input.id } });
  if (!proposal) throw new Error("提案が見つかりません");
  if (proposal.status !== "pending") throw new Error("処理済みの提案です");

  const name = (input.name ?? proposal.name).trim();
  const nodeType = input.nodeType ?? proposal.nodeType;
  const rosterUrl = (input.rosterUrl === undefined ? proposal.rosterUrl : input.rosterUrl)?.trim() || null;
  if (!name) throw new Error("ノード名は必須です");

  let nodeId = proposal.matchedNodeId;
  if (nodeId) {
    const existing = await prisma.node.findUnique({ where: { id: nodeId } });
    if (!existing) nodeId = null;
  }

  if (!nodeId) {
    const created = await prisma.node.create({
      data: {
        name,
        nodeType,
        rosterUrl,
        accessPolicy: "prohibited",
        crawlEnabled: false,
        basePathScore: nodeType === "association" ? 40 : 30,
        note: proposal.evidenceText,
      },
    });
    nodeId = created.id;
  }

  await prisma.partnerNodeMembership.upsert({
    where: { partnerId_nodeId: { partnerId: proposal.partnerId, nodeId } },
    update: {},
    create: { partnerId: proposal.partnerId, nodeId, note: "node-discover 採用" },
  });

  const after = await prisma.nodeProposal.update({
    where: { id: proposal.id },
    data: {
      name,
      nodeType,
      rosterUrl,
      status: "accepted",
      acceptedNodeId: nodeId,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "accept",
    entityType: "node_proposal",
    entityId: proposal.id,
    before: proposal,
    after,
  });

  revalidatePath("/nodes");
  revalidatePath("/partners");
  revalidatePath("/dashboard");
  return after;
}

export async function rejectNodeProposal(id: string) {
  const user = await requireUser({ adminOnly: true });
  const proposal = await prisma.nodeProposal.findUnique({ where: { id } });
  if (!proposal) throw new Error("提案が見つかりません");
  if (proposal.status !== "pending") throw new Error("処理済みの提案です");

  const after = await prisma.nodeProposal.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "reject",
    entityType: "node_proposal",
    entityId: id,
    before: proposal,
    after,
  });
  revalidatePath("/nodes");
  revalidatePath("/dashboard");
  return after;
}
