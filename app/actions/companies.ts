"use server";

import { revalidatePath } from "next/cache";
import type { CompanyStatus, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { scoreCompany } from "@/lib/scoring/engine";
import { dispatchJob } from "@/lib/jobs/runner";
import { requireLlmConfigured } from "@/lib/llm/config";
import { autoDraftPriorityAIntros } from "@/lib/intro/auto-draft";
import { findIntroPaths } from "@/lib/intro/paths";

export type CompanyListFilters = {
  status?: CompanyStatus;
  priority?: Priority;
  prefecture?: string;
  q?: string;
  stage?: string;
  node?: string;
  lostReason?: string;
};

export async function listCompanies(filters: CompanyListFilters = {}) {
  await requireUser();
  const companies = await prisma.company.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.prefecture ? { prefecture: filters.prefecture } : {}),
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { city: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
      nodeMemberships: { include: { node: { select: { id: true, name: true } } } },
      pipelineEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const filtered = filters.priority
    ? companies.filter((c) => c.scores[0]?.priority === filters.priority)
    : companies;

  return filtered.map((company) => ({
    id: company.id,
    name: company.name,
    url: company.url,
    prefecture: company.prefecture,
    city: company.city,
    status: company.status,
    exclusionReason: company.exclusionReason,
    discoveredAt: company.discoveredAt.toISOString(),
    priority: company.scores[0]?.priority ?? null,
    icpScore: company.scores[0]?.icpScore ?? null,
    pathScore: company.scores[0]?.pathScore ?? null,
    nodes: company.nodeMemberships.map((nm) => nm.node.name),
    latestStage: company.pipelineEvents[0]?.stage ?? "not_contacted",
    lostReason: company.pipelineEvents[0]?.lostReason ?? null,
    outOfCoverage: Boolean(
      (company.scores[0]?.breakdown as Record<string, unknown> | null)?.["priority:out_of_coverage"] !== undefined,
    ),
  }));
}

export async function getCompanyDetail(id: string) {
  await requireUser();
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      profile: true,
      signals: { orderBy: { extractedAt: "desc" } },
      scores: { orderBy: { calculatedAt: "desc" }, take: 5 },
      nodeMemberships: { include: { node: true } },
      introRequests: {
        include: {
          viaPartner: { select: { id: true, name: true } },
          viaNode: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      pipelineEvents: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { occurredAt: "desc" },
      },
      contactLogs: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { contactedAt: "desc" },
      },
    },
  });
  if (!company) throw new Error("Company not found");

  const paths = await findIntroPaths(id);
  return { company, paths };
}

export async function rerunSignalExtract(companyId: string) {
  await requireUser({ adminOnly: true });
  await requireLlmConfigured();
  const job = await prisma.jobRun.create({
    data: {
      jobType: "signal_extract",
      payload: { companyId },
    },
  });
  void dispatchJob(job.id, "signal_extract", { companyId });
  revalidatePath(`/companies/${companyId}`);
  return job.id;
}

export async function rescoreCompany(companyId: string) {
  await requireUser({ adminOnly: true });
  await scoreCompany(companyId);
  await autoDraftPriorityAIntros({ companyId });
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  revalidatePath("/intro-requests");
}
