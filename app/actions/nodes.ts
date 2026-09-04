"use server";

import { revalidatePath } from "next/cache";
import type { AccessPolicy, NodeType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";

function serializeNode(
  node: {
    id: string;
    name: string;
    nodeType: NodeType;
    rosterUrl: string | null;
    accessPolicy: AccessPolicy;
    crawlEnabled: boolean;
    basePathScore: number;
    lastCrawledAt: Date | null;
    note: string | null;
    partnerMemberships?: Array<{ partner: { id: string; name: string } }>;
    _count?: { companyMemberships: number; crawlRuns: number };
  },
) {
  return {
    id: node.id,
    name: node.name,
    nodeType: node.nodeType,
    rosterUrl: node.rosterUrl,
    accessPolicy: node.accessPolicy,
    crawlEnabled: node.crawlEnabled,
    basePathScore: node.basePathScore,
    lastCrawledAt: node.lastCrawledAt?.toISOString() ?? null,
    note: node.note,
    partners: (node.partnerMemberships ?? []).map((m) => ({ id: m.partner.id, name: m.partner.name })),
    _count: node._count ?? { companyMemberships: 0, crawlRuns: 0 },
  };
}

export async function listPartnerOptions() {
  await requireUser({ adminOnly: true });
  return prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, prefecture: true },
  });
}

export async function listNodes() {
  await requireUser({ adminOnly: true });
  const rows = await prisma.node.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { companyMemberships: true, crawlRuns: true } },
      partnerMemberships: {
        include: { partner: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return rows.map(serializeNode);
}

export async function saveNode(input: {
  id?: string;
  name: string;
  nodeType: NodeType;
  rosterUrl?: string;
  accessPolicy: AccessPolicy;
  crawlEnabled?: boolean;
  basePathScore?: number;
  note?: string;
  partnerIds?: string[];
}) {
  const user = await requireUser({ adminOnly: true });
  const data = {
    name: input.name.trim(),
    nodeType: input.nodeType,
    rosterUrl: input.rosterUrl?.trim() || null,
    accessPolicy: input.accessPolicy,
    crawlEnabled: input.crawlEnabled ?? false,
    basePathScore: input.basePathScore ?? 0,
    note: input.note?.trim() || null,
  };

  let node;
  if (input.id) {
    const before = await prisma.node.findUnique({ where: { id: input.id } });
    node = await prisma.node.update({ where: { id: input.id }, data });
    await writeAuditLog({
      userId: user.id,
      action: "update",
      entityType: "node",
      entityId: node.id,
      before,
      after: node,
    });
  } else {
    node = await prisma.node.create({ data });
    await writeAuditLog({
      userId: user.id,
      action: "create",
      entityType: "node",
      entityId: node.id,
      after: node,
    });
  }

  if (input.partnerIds) {
    const uniqueIds = [...new Set(input.partnerIds)];
    const validPartners = uniqueIds.length
      ? await prisma.partner.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true },
        })
      : [];
    await prisma.partnerNodeMembership.deleteMany({ where: { nodeId: node.id } });
    for (const partner of validPartners) {
      await prisma.partnerNodeMembership.create({
        data: { nodeId: node.id, partnerId: partner.id },
      });
    }
  }

  const saved = await prisma.node.findUniqueOrThrow({
    where: { id: node.id },
    include: {
      _count: { select: { companyMemberships: true, crawlRuns: true } },
      partnerMemberships: {
        include: { partner: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  revalidatePath("/nodes");
  revalidatePath("/partners");
  revalidatePath("/admin");
  return serializeNode(saved);
}

export async function deleteNode(id: string) {
  const user = await requireUser({ adminOnly: true });
  const before = await prisma.node.findUnique({ where: { id } });
  await prisma.node.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    action: "delete",
    entityType: "node",
    entityId: id,
    before,
  });
  revalidatePath("/nodes");
}
