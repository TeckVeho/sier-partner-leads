"use server";

import { revalidatePath } from "next/cache";
import type { JobRunType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { dispatchJob } from "@/lib/jobs/runner";
import { requireLlmConfigured } from "@/lib/llm/config";

export async function startJob(jobType: JobRunType, payload: Record<string, unknown> = {}) {
  const user = await requireUser({ adminOnly: true });
  await requireLlmConfigured();
  const job = await prisma.jobRun.create({
    data: { jobType, payload: payload as object },
  });
  await writeAuditLog({
    userId: user.id,
    action: "start_job",
    entityType: "job_run",
    entityId: job.id,
    after: { jobType, payload },
  });
  void dispatchJob(job.id, jobType, payload);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/nodes");
  revalidatePath("/partners");
  revalidatePath("/intro-requests");
  return job;
}

export async function listRecentJobs(limit = 20) {
  await requireUser({ adminOnly: true });
  return prisma.jobRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listAuditLogs(limit = 50) {
  await requireUser({ adminOnly: true });
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function listCrawlRuns(limit = 20) {
  await requireUser({ adminOnly: true });
  return prisma.crawlRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { node: { select: { name: true } } },
  });
}

export async function getJob(jobId: string) {
  await requireUser({ adminOnly: true });
  return prisma.jobRun.findUnique({ where: { id: jobId } });
}

export type MonitorJob = {
  id: string;
  jobType: JobRunType;
  status: string;
  progress: number;
  progressNote: string | null;
  errorMessage: string | null;
  result: Record<string, unknown> | null;
  companyId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ExecutionMonitorSnapshot = {
  steps: Array<{
    key: "roster_crawl" | "signal_extract" | "score_recalc" | "intro_draft";
    label: string;
    status: "idle" | "running" | "completed" | "failed";
    progress: number;
    note: string | null;
  }>;
  active: MonitorJob | null;
  latest: MonitorJob | null;
  report: Record<string, unknown> | null;
  outOfCoverageCount: number;
  crawlFailedCount: number;
  pendingProposalCount: number;
};

function serializeMonitorJob(job: {
  id: string;
  jobType: JobRunType;
  status: string;
  progress: number;
  progressNote: string | null;
  errorMessage: string | null;
  result: unknown;
  payload: unknown;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}): MonitorJob {
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    progress: job.progress,
    progressNote: job.progressNote,
    errorMessage: job.errorMessage,
    result: (job.result ?? null) as Record<string, unknown> | null,
    companyId: typeof payload.companyId === "string" ? payload.companyId : null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export async function getExecutionMonitor(): Promise<ExecutionMonitorSnapshot> {
  await requireUser();
  const [jobs, candidates, recentCrawls, pendingProposalCount] = await Promise.all([
    prisma.jobRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.company.findMany({
      where: { status: "candidate" },
      select: {
        scores: { orderBy: { calculatedAt: "desc" }, take: 1, select: { breakdown: true } },
      },
    }),
    prisma.crawlRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { status: true },
    }),
    prisma.nodeProposal.count({ where: { status: "pending" } }),
  ]);

  const serialized = jobs.map(serializeMonitorJob);
  const playbook = serialized.filter((job) => !(job.jobType === "signal_extract" && job.companyId));
  const latestLedger = playbook.find((job) => job.jobType === "ledger_update") ?? null;
  const latest = latestLedger ?? playbook[0] ?? serialized[0] ?? null;
  const active = serialized.find((job) => job.status === "running" || job.status === "pending") ?? null;

  const phase = typeof (active ?? latestLedger)?.result?.phase === "string"
    ? String((active ?? latestLedger)?.result?.phase)
    : null;
  const ledgerResult = (latestLedger?.result ?? {}) as Record<string, unknown>;
  const crawlDone = Boolean(ledgerResult.crawl);
  const extractDone = Boolean(ledgerResult.extract);
  const scoreDone = Boolean(ledgerResult.score);
  const introResult = ledgerResult.intro && typeof ledgerResult.intro === "object"
    ? (ledgerResult.intro as Record<string, unknown>)
    : null;
  const introDone = Boolean(introResult);
  const running = active?.jobType === "ledger_update";
  const introEligible = typeof introResult?.eligible === "number" ? introResult.eligible : null;
  const introNote = introResult
    ? introEligible === 0
      ? "対象なし"
      : `下書き ${Number(introResult.drafted ?? 0)} 件 / 経路なしスキップ ${Number(introResult.skippedNoPath ?? 0)} 件`
    : null;

  const steps = [
    {
      key: "roster_crawl" as const,
      label: "名簿クロール",
      status: (running && phase === "roster_crawl"
        ? "running"
        : crawlDone || (latestLedger?.status === "completed" && phase === "done")
          ? "completed"
          : latestLedger?.status === "failed" && phase === "roster_crawl"
            ? "failed"
            : "idle") as "idle" | "running" | "completed" | "failed",
      progress: running && phase === "roster_crawl" ? active?.progress ?? 0 : crawlDone ? 100 : 0,
      note: running && phase === "roster_crawl" ? active?.progressNote ?? null : null,
    },
    {
      key: "signal_extract" as const,
      label: "再調査",
      status: (running && phase === "signal_extract"
        ? "running"
        : extractDone
          ? "completed"
          : latestLedger?.status === "failed" && phase === "signal_extract"
            ? "failed"
            : "idle") as "idle" | "running" | "completed" | "failed",
      progress: running && phase === "signal_extract" ? active?.progress ?? 0 : extractDone ? 100 : 0,
      note: running && phase === "signal_extract" ? active?.progressNote ?? null : null,
    },
    {
      key: "score_recalc" as const,
      label: "スコア再計算",
      status: (running && phase === "score_recalc"
        ? "running"
        : scoreDone
          ? "completed"
          : latestLedger?.status === "failed" && phase === "score_recalc"
            ? "failed"
            : "idle") as "idle" | "running" | "completed" | "failed",
      progress: running && phase === "score_recalc" ? active?.progress ?? 0 : scoreDone ? 100 : 0,
      note: running && phase === "score_recalc" ? active?.progressNote ?? null : null,
    },
    {
      key: "intro_draft" as const,
      label: "依頼下書き",
      status: (running && phase === "intro_draft"
        ? "running"
        : introDone
          ? "completed"
          : latestLedger?.status === "failed" && phase === "intro_draft"
            ? "failed"
            : "idle") as "idle" | "running" | "completed" | "failed",
      progress: running && phase === "intro_draft" ? active?.progress ?? 0 : introDone ? 100 : 0,
      note: running && phase === "intro_draft" ? active?.progressNote ?? introNote : introNote,
    },
  ];

  const outOfCoverageCount = candidates.filter((company) => {
    const breakdown = company.scores[0]?.breakdown as Record<string, unknown> | null;
    return Boolean(breakdown && "priority:out_of_coverage" in breakdown);
  }).length;

  return {
    steps,
    active,
    latest,
    report: latestLedger?.status === "completed" && ledgerResult.kind === "ledger_update" ? ledgerResult : null,
    outOfCoverageCount,
    crawlFailedCount: recentCrawls.filter((run) => run.status === "failed").length,
    pendingProposalCount,
  };
}
