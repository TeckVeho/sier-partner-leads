"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { getLatestRulesVersion } from "@/lib/scoring/engine";

export async function listScoringRules() {
  await requireUser({ adminOnly: true });
  const version = await getLatestRulesVersion();
  return prisma.scoringRule.findMany({
    where: { version },
    orderBy: [{ axis: "asc" }, { ruleKey: "asc" }],
  });
}

export async function saveScoringRule(input: {
  id?: string;
  ruleKey: string;
  axis: "icp" | "path";
  weight: number;
  isExclusion?: boolean;
}) {
  const user = await requireUser({ adminOnly: true });
  const version = await getLatestRulesVersion();

  if (input.id) {
    const before = await prisma.scoringRule.findUnique({ where: { id: input.id } });
    const updated = await prisma.scoringRule.update({
      where: { id: input.id },
      data: {
        ruleKey: input.ruleKey,
        axis: input.axis,
        weight: input.weight,
        isExclusion: input.isExclusion ?? false,
      },
    });
    await writeAuditLog({
      userId: user.id,
      action: "update",
      entityType: "scoring_rule",
      entityId: updated.id,
      before,
      after: updated,
    });
    revalidatePath("/scoring-rules");
    return updated;
  }

  const created = await prisma.scoringRule.create({
    data: {
      ruleKey: input.ruleKey,
      axis: input.axis,
      weight: input.weight,
      isExclusion: input.isExclusion ?? false,
      version,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "create",
    entityType: "scoring_rule",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/scoring-rules");
  return created;
}

export async function bumpScoringRulesVersion() {
  const user = await requireUser({ adminOnly: true });
  const current = await getLatestRulesVersion();
  const next = current + 1;
  const rules = await prisma.scoringRule.findMany({ where: { version: current } });
  for (const rule of rules) {
    await prisma.scoringRule.create({
      data: {
        ruleKey: rule.ruleKey,
        axis: rule.axis,
        weight: rule.weight,
        isExclusion: rule.isExclusion,
        version: next,
      },
    });
  }
  await writeAuditLog({
    userId: user.id,
    action: "bump_version",
    entityType: "scoring_rule",
    after: { version: next },
  });
  revalidatePath("/scoring-rules");
  return next;
}
