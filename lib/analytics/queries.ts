import type { PipelineStage, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PIPELINE_ORDER } from "@/lib/scoring/labels";

export const FUNNEL_STAGES: PipelineStage[] = [
  "not_contacted",
  "requested",
  "intro_obtained",
  "first_contact",
  "meeting",
  "partnership",
];

export const PRIORITY_ORDER: Priority[] = ["A", "B", "C", "hold"];

const STAGE_RANK: Record<PipelineStage, number> = {
  not_contacted: 0,
  requested: 1,
  intro_obtained: 2,
  first_contact: 3,
  meeting: 4,
  partnership: 5,
  lost: -1,
};

export type OutcomeKey = "not_contacted" | "in_progress" | "meeting" | "partnership" | "lost";

export const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  not_contacted: "未接触",
  in_progress: "進行中",
  meeting: "商談",
  partnership: "提携",
  lost: "見送り",
};

function outcomeOf(stage: PipelineStage): OutcomeKey {
  if (stage === "lost") return "lost";
  if (stage === "partnership") return "partnership";
  if (stage === "meeting") return "meeting";
  if (stage === "not_contacted") return "not_contacted";
  return "in_progress";
}

export async function getAnalyticsSummary() {
  const [companies, excludedCount, onHoldCount] = await Promise.all([
    prisma.company.findMany({
      where: { status: "candidate" },
      include: {
        scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        pipelineEvents: { orderBy: { occurredAt: "desc" } },
        nodeMemberships: { include: { node: { select: { id: true, name: true } } } },
        signals: { select: { signalType: true } },
      },
    }),
    prisma.company.count({ where: { status: "excluded" } }),
    prisma.company.count({ where: { status: "on_hold" } }),
  ]);

  const totalCandidates = companies.length;
  const scored = companies.filter((c) => c.scores[0]);
  const avgIcp =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.scores[0]!.icpScore, 0) / scored.length)
      : 0;
  const avgPath =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.scores[0]!.pathScore, 0) / scored.length)
      : 0;

  const priorityCounts = Object.fromEntries(PRIORITY_ORDER.map((p) => [p, 0])) as Record<Priority, number>;
  let unscoredCount = 0;
  for (const company of companies) {
    const priority = company.scores[0]?.priority;
    if (!priority) {
      unscoredCount += 1;
      continue;
    }
    priorityCounts[priority] += 1;
  }

  const stageCounts = Object.fromEntries(PIPELINE_ORDER.map((s) => [s, 0])) as Record<PipelineStage, number>;
  const reached = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0])) as Record<(typeof FUNNEL_STAGES)[number], number>;

  const outcomeByPriority: Record<Priority | "unscored", Record<OutcomeKey, number>> = {
    A: emptyOutcomes(),
    B: emptyOutcomes(),
    C: emptyOutcomes(),
    hold: emptyOutcomes(),
    unscored: emptyOutcomes(),
  };

  const lostReasonMap = new Map<string, { count: number; byPriority: Partial<Record<Priority, number>> }>();
  const nodeMap = new Map<
    string,
    { nodeId: string; nodeName: string; companies: number; partnership: number; meeting: number; lost: number }
  >();
  const signalMap = new Map<string, { companies: number; partnership: number; meeting: number; lost: number }>();

  let partnershipCount = 0;
  let lostCount = 0;
  let meetingCount = 0;

  for (const company of companies) {
    const latestStage = company.pipelineEvents[0]?.stage ?? "not_contacted";
    stageCounts[latestStage] += 1;
    if (latestStage === "partnership") partnershipCount += 1;
    if (latestStage === "lost") lostCount += 1;
    if (latestStage === "meeting") meetingCount += 1;

    const maxRank = company.pipelineEvents.reduce(
      (max, event) => Math.max(max, STAGE_RANK[event.stage]),
      0,
    );

    for (const stage of FUNNEL_STAGES) {
      if (maxRank >= STAGE_RANK[stage]) reached[stage] += 1;
    }

    const priority = company.scores[0]?.priority;
    const outcome = outcomeOf(latestStage);
    outcomeByPriority[priority ?? "unscored"][outcome] += 1;

    if (latestStage === "lost") {
      const reason = company.pipelineEvents.find((e) => e.stage === "lost")?.lostReason?.trim() || "理由未記入";
      const current = lostReasonMap.get(reason) ?? { count: 0, byPriority: {} };
      current.count += 1;
      if (priority) {
        current.byPriority[priority] = (current.byPriority[priority] ?? 0) + 1;
      }
      lostReasonMap.set(reason, current);
    }

    const seenNodes = new Set<string>();
    for (const membership of company.nodeMemberships) {
      if (seenNodes.has(membership.node.id)) continue;
      seenNodes.add(membership.node.id);
      const row = nodeMap.get(membership.node.id) ?? {
        nodeId: membership.node.id,
        nodeName: membership.node.name,
        companies: 0,
        partnership: 0,
        meeting: 0,
        lost: 0,
      };
      row.companies += 1;
      if (latestStage === "partnership") row.partnership += 1;
      if (latestStage === "meeting") row.meeting += 1;
      if (latestStage === "lost") row.lost += 1;
      nodeMap.set(membership.node.id, row);
    }

    const seenSignals = new Set<string>();
    for (const signal of company.signals) {
      if (seenSignals.has(signal.signalType)) continue;
      seenSignals.add(signal.signalType);
      const row = signalMap.get(signal.signalType) ?? {
        companies: 0,
        partnership: 0,
        meeting: 0,
        lost: 0,
      };
      row.companies += 1;
      if (latestStage === "partnership") row.partnership += 1;
      if (latestStage === "meeting") row.meeting += 1;
      if (latestStage === "lost") row.lost += 1;
      signalMap.set(signal.signalType, row);
    }
  }

  const funnel = FUNNEL_STAGES.map((stage, index) => {
    const count = reached[stage];
    const prev = index === 0 ? totalCandidates : reached[FUNNEL_STAGES[index - 1]!];
    return {
      stage,
      count,
      rateFromPrev: prev > 0 ? Math.round((count / prev) * 100) : 0,
      rateFromStart: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0,
    };
  });

  const lostReasons = [...lostReasonMap.entries()]
    .map(([reason, value]) => ({
      reason,
      count: value.count,
      percent: lostCount > 0 ? Math.round((value.count / lostCount) * 100) : 0,
      byPriority: value.byPriority,
    }))
    .sort((a, b) => b.count - a.count);

  const nodes = [...nodeMap.values()]
    .map((row) => ({
      ...row,
      conversionPercent: row.companies > 0 ? Math.round((row.partnership / row.companies) * 100) : 0,
    }))
    .sort((a, b) => b.companies - a.companies);

  const signals = [...signalMap.entries()]
    .map(([signalType, row]) => ({
      signalType,
      ...row,
      conversionPercent: row.companies > 0 ? Math.round((row.partnership / row.companies) * 100) : 0,
    }))
    .sort((a, b) => b.companies - a.companies);

  const resultSample = partnershipCount + lostCount;

  return {
    totalCandidates,
    excludedCount,
    onHoldCount,
    unscoredCount,
    avgIcp,
    avgPath,
    partnershipCount,
    meetingCount,
    lostCount,
    resultSample,
    sampleNote: resultSample < 20,
    priorityCounts,
    stageCounts,
    funnel,
    outcomeByPriority,
    lostReasons,
    nodes,
    signals,
  };
}

function emptyOutcomes(): Record<OutcomeKey, number> {
  return {
    not_contacted: 0,
    in_progress: 0,
    meeting: 0,
    partnership: 0,
    lost: 0,
  };
}
