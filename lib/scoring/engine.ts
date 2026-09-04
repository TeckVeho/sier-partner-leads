import type { CompanyStatus, Priority, ScoringAxis, SignalPolarity } from "@prisma/client";
import { prisma } from "@/lib/db";
import { determinePriority } from "@/lib/scoring/priority";
import { getCoveragePrefectures, isOutOfCoverage } from "@/lib/settings/target-areas";

type RuleRow = {
  ruleKey: string;
  axis: ScoringAxis;
  weight: number;
  isExclusion: boolean;
};

type SignalRow = {
  signalType: string;
  polarity: SignalPolarity;
};

export async function getLatestRulesVersion(): Promise<number> {
  const latest = await prisma.scoringRule.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return latest?.version ?? 1;
}

export async function getActiveRules(version?: number): Promise<RuleRow[]> {
  const v = version ?? (await getLatestRulesVersion());
  return prisma.scoringRule.findMany({
    where: { version: v },
    select: { ruleKey: true, axis: true, weight: true, isExclusion: true },
  });
}

function hasSignal(signals: SignalRow[], key: string, polarity?: SignalPolarity) {
  return signals.some(
    (s) => s.signalType === key && (polarity ? s.polarity === polarity : true),
  );
}

export function computeScores(input: {
  rules: RuleRow[];
  signals: SignalRow[];
  pathBaseScore: number;
  nodeCount: number;
  outOfCoverage?: boolean;
}): {
  icpScore: number;
  pathScore: number;
  priority: Priority;
  breakdown: Record<string, number>;
  status: CompanyStatus;
  exclusionReason?: string;
} {
  const breakdown: Record<string, number> = {};
  let icpScore = 0;
  let pathScore = input.pathBaseScore;
  breakdown.path_base = input.pathBaseScore;

  for (const rule of input.rules) {
    if (!hasSignal(input.signals, rule.ruleKey)) continue;
    if (rule.isExclusion) {
      return {
        icpScore: 0,
        pathScore: 0,
        priority: "hold",
        breakdown: { ...breakdown, [`exclude:${rule.ruleKey}`]: 0 },
        status: "excluded",
        exclusionReason: `除外シグナル: ${rule.ruleKey}`,
      };
    }
    if (rule.axis === "icp") {
      icpScore += rule.weight;
      breakdown[`icp:${rule.ruleKey}`] = rule.weight;
    } else {
      pathScore += rule.weight;
      breakdown[`path:${rule.ruleKey}`] = rule.weight;
    }
  }

  if (input.nodeCount > 1) {
    const bonus = (input.nodeCount - 1) * 10;
    pathScore += bonus;
    breakdown["path:multi_node_bonus"] = bonus;
  }

  const hasAi = hasSignal(input.signals, "ai_inhouse", "exclusion");
  const hasCrisis = hasSignal(input.signals, "crisis_awareness", "positive");
  const hasLegacy = hasSignal(input.signals, "legacy_asset", "positive");

  if (!hasLegacy) {
    return {
      icpScore,
      pathScore,
      priority: "hold",
      breakdown,
      status: "on_hold",
      exclusionReason: "必須条件未達: レガシー保守基盤のシグナルなし",
    };
  }

  if (hasAi) {
    return {
      icpScore,
      pathScore,
      priority: "hold",
      breakdown,
      status: "excluded",
      exclusionReason: "自社生成AI・内製開発を打ち出している",
    };
  }

  if (!hasCrisis) {
    icpScore = Math.max(0, icpScore - 10);
    breakdown["icp:no_crisis_penalty"] = -10;
  }

  let priority = determinePriority(icpScore, pathScore);
  if (input.outOfCoverage) {
    priority = "C";
    breakdown["priority:out_of_coverage"] = 0;
  }
  return { icpScore, pathScore, priority, breakdown, status: "candidate" };
}

export async function scoreCompany(companyId: string, rulesVersion?: number) {
  const version = rulesVersion ?? (await getLatestRulesVersion());
  const rules = await getActiveRules(version);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      signals: { select: { signalType: true, polarity: true } },
      nodeMemberships: {
        include: {
          node: { select: { basePathScore: true, nodeType: true } },
        },
      },
    },
  });
  if (!company) throw new Error("Company not found");

  const pathBaseScore = company.nodeMemberships.reduce(
    (max, nm) => Math.max(max, nm.node.basePathScore),
    0,
  );

  const coverage = await getCoveragePrefectures();
  const result = computeScores({
    rules,
    signals: company.signals,
    pathBaseScore,
    nodeCount: company.nodeMemberships.length,
    outOfCoverage: isOutOfCoverage(company.prefecture, coverage),
  });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      status: result.status,
      exclusionReason: result.exclusionReason ?? null,
    },
  });

  await prisma.companyScore.create({
    data: {
      companyId,
      icpScore: result.icpScore,
      pathScore: result.pathScore,
      priority: result.priority,
      breakdown: result.breakdown,
      rulesVersion: version,
    },
  });

  return result;
}

export async function recalculateAllScores(rulesVersion?: number) {
  const companies = await prisma.company.findMany({
    where: { status: { in: ["candidate", "on_hold", "excluded"] } },
    select: { id: true },
  });
  for (const company of companies) {
    await scoreCompany(company.id, rulesVersion);
  }
  return companies.length;
}
