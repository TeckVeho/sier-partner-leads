"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import { ALL_PREFECTURES } from "@/lib/geo/prefectures";
import { recalculateAllScores } from "@/lib/scoring/engine";

function withTargetPrefectures<T extends { prefecture: string | null; targetPrefectures?: string[] | null }>(
  row: T,
) {
  return {
    ...row,
    targetPrefectures: row.targetPrefectures ?? (row.prefecture ? [row.prefecture] : []),
  };
}

export async function listPartners() {
  await requireUser({ adminOnly: true });
  const rows = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: {
      nodeMemberships: { include: { node: { select: { id: true, name: true } } } },
    },
  });
  return rows.map(withTargetPrefectures);
}

export async function savePartner(input: {
  id?: string;
  name: string;
  url?: string;
  prefecture?: string;
  targetPrefectures?: string[];
  introContactLevel?: string;
  relationshipNote?: string;
  isActive?: boolean;
  nodeIds?: string[];
}) {
  const user = await requireUser({ adminOnly: true });
  const prefecture = input.prefecture?.trim() || null;
  const selected = (input.targetPrefectures ?? []).filter((name) => ALL_PREFECTURES.includes(name));
  const targetPrefectures = selected.length > 0 ? selected : prefecture ? [prefecture] : [];
  const data = {
    name: input.name.trim(),
    url: input.url?.trim() || null,
    prefecture,
    targetPrefectures,
    introContactLevel: input.introContactLevel?.trim() || null,
    relationshipNote: input.relationshipNote?.trim() || null,
    isActive: input.isActive ?? true,
  };

  let partner;
  if (input.id) {
    const before = await prisma.partner.findUnique({ where: { id: input.id } });
    partner = await prisma.partner.update({ where: { id: input.id }, data });
    await writeAuditLog({
      userId: user.id,
      action: "update",
      entityType: "partner",
      entityId: partner.id,
      before,
      after: partner,
    });
  } else {
    partner = await prisma.partner.create({ data });
    await writeAuditLog({
      userId: user.id,
      action: "create",
      entityType: "partner",
      entityId: partner.id,
      after: partner,
    });
  }

  if (input.nodeIds) {
    await prisma.partnerNodeMembership.deleteMany({ where: { partnerId: partner.id } });
    for (const nodeId of input.nodeIds) {
      await prisma.partnerNodeMembership.create({
        data: { partnerId: partner.id, nodeId },
      });
    }
  }

  revalidatePath("/partners");
  revalidatePath("/companies");
  await recalculateAllScores();
  return withTargetPrefectures(partner);
}

export async function deletePartner(id: string) {
  const user = await requireUser({ adminOnly: true });
  const before = await prisma.partner.findUnique({ where: { id } });
  await prisma.partner.delete({ where: { id } });
  await writeAuditLog({
    userId: user.id,
    action: "delete",
    entityType: "partner",
    entityId: id,
    before,
  });
  revalidatePath("/partners");
  revalidatePath("/companies");
  await recalculateAllScores();
}
