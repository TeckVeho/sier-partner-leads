import { prisma } from "@/lib/db";
import { extractRosterEntries } from "@/lib/crawl/roster";
import { fetchHtml, sleep } from "@/lib/crawl/fetcher";
import { isRobotsAllowed } from "@/lib/crawl/robots";
import { collectSitePages } from "@/lib/crawl/site-pages";
import { scoreCompany } from "@/lib/scoring/engine";
import { autoDraftPriorityAIntros, formatIntroDraftNote } from "@/lib/intro/auto-draft";
import { isLlmConfigured, LLM_KEY_ERROR } from "@/lib/llm/config";
import { runSignalExtract } from "@/lib/llm/run-signal-extract";
import { isUsableProfile } from "@/lib/llm/schemas";
import { findMatchingNode, normalizeNodeName, urlAppearsInText } from "@/lib/nodes/match";
import { reverseLookupOfficialRosters } from "@/lib/nodes/roster-reverse";
import { runNodeDiscover } from "@/lib/llm/run-node-discover";

async function updateJob(jobId: string, data: {
  status?: "pending" | "running" | "completed" | "failed";
  progress?: number;
  progressNote?: string;
  errorMessage?: string;
  result?: unknown;
  startedAt?: Date;
  finishedAt?: Date;
}) {
  await prisma.jobRun.update({
    where: { id: jobId },
    data: {
      status: data.status,
      progress: data.progress,
      progressNote: data.progressNote,
      errorMessage: data.errorMessage,
      result: data.result as object | undefined,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
    },
  });
}

async function upsertCompanyFromRoster(input: {
  name: string;
  prefecture: string | null;
  city: string | null;
  website: string | null;
  nodeId: string;
  sourceUrl: string;
}) {
  if (!input.prefecture) return { created: false, updated: false };

  const existing = await prisma.company.findFirst({
    where: {
      OR: [
        { name: input.name },
        ...(input.website ? [{ url: input.website }] : []),
      ],
    },
  });

  let companyId: string;
  let created = false;
  if (existing) {
    companyId = existing.id;
  } else {
    const createdCompany = await prisma.company.create({
      data: {
        name: input.name,
        prefecture: input.prefecture,
        city: input.city,
        url: input.website,
        status: "candidate",
      },
    });
    companyId = createdCompany.id;
    created = true;
  }

  await prisma.nodeMembership.upsert({
    where: {
      nodeId_companyId: { nodeId: input.nodeId, companyId },
    },
    update: { sourceUrl: input.sourceUrl },
    create: {
      nodeId: input.nodeId,
      companyId,
      sourceUrl: input.sourceUrl,
    },
  });

  return { created, updated: !created, companyId };
}

type ProgressFn = (progress: number, note: string) => Promise<void>;

async function performRosterCrawl(onProgress: ProgressFn) {
  const nodes = await prisma.node.findMany({
    where: { crawlEnabled: true, accessPolicy: "public", rosterUrl: { not: null } },
  });

  let newCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const failedNotes: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const url = node.rosterUrl!;
    await onProgress(Math.round((i / Math.max(nodes.length, 1)) * 100), `${node.name} を取得中`);

    const allowed = await isRobotsAllowed(url);
    if (!allowed) {
      failedCount += 1;
      failedNotes.push(`${node.name}: robots.txt により禁止`);
      await prisma.crawlRun.create({
        data: {
          nodeId: node.id,
          sourceUrl: url,
          status: "failed",
          robotsAllowed: false,
          errorMessage: "robots.txt により禁止",
        },
      });
      continue;
    }

    try {
      const html = await fetchHtml(url);
      const entries = extractRosterEntries(html, url);
      let nodeNew = 0;
      for (const entry of entries) {
        const result = await upsertCompanyFromRoster({
          name: entry.name,
          prefecture: entry.prefecture,
          city: entry.city,
          website: entry.website,
          nodeId: node.id,
          sourceUrl: url,
        });
        if (result.created) nodeNew += 1;
        if (result.updated) updatedCount += 1;
      }
      newCount += nodeNew;
      await prisma.crawlRun.create({
        data: {
          nodeId: node.id,
          sourceUrl: url,
          status: "success",
          robotsAllowed: true,
          newCount: nodeNew,
          updatedCount: entries.length - nodeNew,
        },
      });
      await prisma.node.update({
        where: { id: node.id },
        data: { lastCrawledAt: new Date() },
      });
    } catch (error) {
      failedCount += 1;
      failedNotes.push(`${node.name}: ${error instanceof Error ? error.message : "unknown"}`);
      await prisma.crawlRun.create({
        data: {
          nodeId: node.id,
          sourceUrl: url,
          status: "failed",
          robotsAllowed: true,
          errorMessage: error instanceof Error ? error.message : "unknown",
        },
      });
    }

    await sleep(3000);
  }

  return { newCount, updatedCount, failedCount, failedNotes, nodeCount: nodes.length };
}

async function performSignalExtract(onProgress: ProgressFn, companyId?: string) {
  const companies = await prisma.company.findMany({
    where: companyId ? { id: companyId } : { status: { in: ["candidate", "on_hold"] } },
    select: { id: true, url: true, name: true },
  });

  let llmCount = 0;
  let skippedNoUrl = 0;
  let failedCount = 0;
  let insufficientCount = 0;
  const insufficientNotes: string[] = [];
  const failedNotes: string[] = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i]!;
    await onProgress(Math.round((i / Math.max(companies.length, 1)) * 100), `${company.name} を調査中`);
    if (!company.url) {
      skippedNoUrl += 1;
      continue;
    }
    try {
      const collected = await collectSitePages(company.url);
      const textLength = collected.pages.reduce((sum, page) => sum + page.text.length, 0);
      if (collected.pages.length === 0 || textLength < 120) {
        insufficientCount += 1;
        insufficientNotes.push(`${company.name}: 本文が短い`);
        continue;
      }
      const extracted = await runSignalExtract({
        companyName: company.name,
        url: company.url,
        pages: collected.pages,
      });
      llmCount += 1;

      if (extracted.insufficient) {
        insufficientCount += 1;
        insufficientNotes.push(`${company.name}: 根拠不足（既存シグナルを保持）`);
        continue;
      }

      const profileSource =
        collected.pages.find((page) => page.id === extracted.profile.sourcePageId)?.url ?? collected.pages[0]!.url;

      await prisma.$transaction(async (tx) => {
        await tx.signal.deleteMany({ where: { companyId: company.id } });
        if (extracted.signals.length > 0) {
          await tx.signal.createMany({
            data: extracted.signals.map((signal) => ({
              companyId: company.id,
              signalType: signal.signalType,
              polarity: signal.polarity,
              evidenceText: signal.evidenceText,
              sourceUrl: signal.sourceUrl ?? company.url ?? "",
              confidence: signal.confidence,
              modelVersion: extracted.modelVersion,
            })),
          });
        }
        if (isUsableProfile(extracted.profile)) {
          await tx.companyProfile.upsert({
            where: { companyId: company.id },
            create: {
              companyId: company.id,
              summary: extracted.profile.summary,
              businessModel: extracted.profile.businessModel,
              offerings: extracted.profile.offerings,
              customers: extracted.profile.customers || null,
              techAssets: extracted.profile.techAssets || null,
              changeSignals: extracted.profile.changeSignals || null,
              cautions: extracted.profile.cautions || null,
              establishedYear: extracted.profile.establishedYear || null,
              employeeScale: extracted.profile.employeeScale || null,
              evidenceText: extracted.profile.evidenceText || null,
              sourceUrl: profileSource,
              modelVersion: extracted.modelVersion,
              extractedAt: new Date(),
            },
            update: {
              summary: extracted.profile.summary,
              businessModel: extracted.profile.businessModel,
              offerings: extracted.profile.offerings,
              customers: extracted.profile.customers || null,
              techAssets: extracted.profile.techAssets || null,
              changeSignals: extracted.profile.changeSignals || null,
              cautions: extracted.profile.cautions || null,
              establishedYear: extracted.profile.establishedYear || null,
              employeeScale: extracted.profile.employeeScale || null,
              evidenceText: extracted.profile.evidenceText || null,
              sourceUrl: profileSource,
              modelVersion: extracted.modelVersion,
              extractedAt: new Date(),
            },
          });
        }
      });
      await scoreCompany(company.id);
    } catch (error) {
      failedCount += 1;
      failedNotes.push(`${company.name}: ${error instanceof Error ? error.message : "取得または判定に失敗"}`);
    }
    await sleep(1000);
  }

  return {
    llmCount,
    failedCount,
    insufficientCount,
    skippedNoUrl,
    companyCount: companies.length,
    insufficientNotes,
    failedNotes,
  };
}

async function performScoreRecalc() {
  const { recalculateAllScores } = await import("@/lib/scoring/engine");
  const count = await recalculateAllScores();
  return { count };
}

async function countOutOfCoverage() {
  const candidates = await prisma.company.findMany({
    where: { status: "candidate" },
    select: { scores: { orderBy: { calculatedAt: "desc" }, take: 1, select: { breakdown: true } } },
  });
  return candidates.filter((company) => {
    const breakdown = company.scores[0]?.breakdown as Record<string, unknown> | null;
    return Boolean(breakdown && "priority:out_of_coverage" in breakdown);
  }).length;
}

export async function runRosterCrawlJob(jobId: string) {
  if (!(await isLlmConfigured())) {
    await updateJob(jobId, { status: "failed", errorMessage: LLM_KEY_ERROR, finishedAt: new Date() });
    return;
  }
  await updateJob(jobId, { status: "running", progress: 0, progressNote: "名簿クロールを開始", startedAt: new Date() });
  const crawl = await performRosterCrawl(async (progress, progressNote) => {
    await updateJob(jobId, { progress, progressNote });
  });
  await updateJob(jobId, {
    status: "completed",
    progress: 100,
    progressNote: `完了: 新規 ${crawl.newCount} 件`,
    result: crawl,
    finishedAt: new Date(),
  });
}

export async function runSignalExtractJob(jobId: string, companyId?: string) {
  if (!(await isLlmConfigured())) {
    await updateJob(jobId, { status: "failed", errorMessage: LLM_KEY_ERROR, finishedAt: new Date() });
    return;
  }
  await updateJob(jobId, { status: "running", progress: 0, progressNote: "再調査を開始", startedAt: new Date() });
  const extract = await performSignalExtract(async (progress, progressNote) => {
    await updateJob(jobId, { progress: Math.round(progress * 0.88), progressNote });
  }, companyId);
  await updateJob(jobId, { progress: 88, progressNote: "優先度Aの依頼下書きを確認" });
  const intro = await autoDraftPriorityAIntros({
    companyId,
    onProgress: async (_done, _total, note) => {
      await updateJob(jobId, { progress: 92, progressNote: note });
    },
  });
  await updateJob(jobId, {
    status: "completed",
    progress: 100,
    progressNote: `再調査が完了（AI ${extract.llmCount} / 失敗 ${extract.failedCount} / 根拠不足 ${extract.insufficientCount} / ${formatIntroDraftNote(intro)}）`,
    result: { provider: "gemini", fallback: false, skill: "signal-extract", ...extract, intro },
    finishedAt: new Date(),
  });
}

export async function runScoreRecalcJob(jobId: string) {
  await updateJob(jobId, { status: "running", progress: 0, progressNote: "スコア再計算中", startedAt: new Date() });
  const score = await performScoreRecalc();
  await updateJob(jobId, { progress: 80, progressNote: "優先度Aの依頼下書きを確認" });
  const intro = await autoDraftPriorityAIntros({
    onProgress: async (_done, _total, note) => {
      await updateJob(jobId, { progress: 90, progressNote: note });
    },
  });
  await updateJob(jobId, {
    status: "completed",
    progress: 100,
    progressNote: `${score.count} 社を再計算 / ${formatIntroDraftNote(intro)}`,
    result: { ...score, intro },
    finishedAt: new Date(),
  });
}

export async function runLedgerUpdateJob(jobId: string) {
  if (!(await isLlmConfigured())) {
    await updateJob(jobId, { status: "failed", errorMessage: LLM_KEY_ERROR, finishedAt: new Date() });
    return;
  }

  try {
    await updateJob(jobId, {
      status: "running",
      progress: 0,
      progressNote: "名簿クロールを開始",
      startedAt: new Date(),
      result: { kind: "ledger_update", phase: "roster_crawl" },
    });

    const crawl = await performRosterCrawl(async (progress, progressNote) => {
      await updateJob(jobId, {
        progress: Math.round(progress * 0.3),
        progressNote,
        result: { kind: "ledger_update", phase: "roster_crawl" },
      });
    });

    await updateJob(jobId, {
      progress: 30,
      progressNote: "再調査を開始",
      result: { kind: "ledger_update", phase: "signal_extract", crawl },
    });

    const extract = await performSignalExtract(async (progress, progressNote) => {
      await updateJob(jobId, {
        progress: 30 + Math.round(progress * 0.42),
        progressNote,
        result: { kind: "ledger_update", phase: "signal_extract", crawl },
      });
    });

    await updateJob(jobId, {
      progress: 72,
      progressNote: "スコア再計算中",
      result: { kind: "ledger_update", phase: "score_recalc", crawl, extract },
    });

    const score = await performScoreRecalc();
    const outOfCoverageCount = await countOutOfCoverage();

    await updateJob(jobId, {
      progress: 86,
      progressNote: "優先度Aの依頼下書きを確認",
      result: { kind: "ledger_update", phase: "intro_draft", crawl, extract, score, outOfCoverageCount },
    });

    const intro = await autoDraftPriorityAIntros({
      onProgress: async (done, total, note) => {
        const pct = total === 0 ? 100 : Math.round((done / total) * 100);
        await updateJob(jobId, {
          progress: 86 + Math.round(pct * 0.14),
          progressNote: note,
          result: { kind: "ledger_update", phase: "intro_draft", crawl, extract, score, outOfCoverageCount },
        });
      },
    });

    const report = {
      kind: "ledger_update" as const,
      phase: "done" as const,
      crawl,
      extract,
      score,
      intro,
      outOfCoverageCount,
    };

    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      progressNote: `台帳更新が完了（新規 ${crawl.newCount} / AI ${extract.llmCount} / 再計算 ${score.count} / ${formatIntroDraftNote(intro)}）`,
      result: report,
      finishedAt: new Date(),
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "台帳更新に失敗しました",
      finishedAt: new Date(),
    });
  }
}

export async function runNodeDiscoveryJob(jobId: string, partnerId?: string) {
  try {
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    progressNote: "ノード提案を開始",
    startedAt: new Date(),
  });

  if (!(await isLlmConfigured())) {
    await updateJob(jobId, {
      status: "failed",
      errorMessage: LLM_KEY_ERROR,
      finishedAt: new Date(),
    });
    return;
  }

  const partners = await prisma.partner.findMany({
    where: partnerId ? { id: partnerId, isActive: true } : { isActive: true },
    orderBy: { name: "asc" },
  });
  if (partners.length === 0) {
    await updateJob(jobId, {
      status: "failed",
      errorMessage: "対象の既存パートナーがありません",
      finishedAt: new Date(),
    });
    return;
  }

  const existingNodes = await prisma.node.findMany({
    select: { id: true, name: true, rosterUrl: true },
  });
  const existingPending = await prisma.nodeProposal.findMany({
    where: { status: "pending" },
    select: { partnerId: true, name: true },
  });
  const pendingKeys = new Set(existingPending.map((row) => `${row.partnerId}:${normalizeNodeName(row.name)}`));

  let created = 0;
  let skipped = 0;
  let insufficient = 0;
  const notes: string[] = [];

  const directorySources = await prisma.directorySource.findMany();
  const roster = await reverseLookupOfficialRosters({
    sources: directorySources,
    partners,
    nodes: existingNodes,
  });
  notes.push(...roster.notes);
  for (const hit of roster.hits) {
    const key = `${hit.partnerId}:${normalizeNodeName(hit.directoryName)}`;
    if (pendingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    await prisma.nodeProposal.create({
      data: {
        partnerId: hit.partnerId,
        jobRunId: jobId,
        name: hit.directoryName,
        nodeType: hit.nodeType,
        rosterUrl: hit.rosterUrl,
        evidenceText: hit.evidenceText,
        confidence: 0.95,
        matchedNodeId: hit.matchedNodeId,
        discoveryMethod: "official_roster",
        relationType: "member",
        sourceUrl: hit.rosterUrl,
        evidenceStrength: "explicit",
        modelVersion: "official-roster-reverse",
      },
    });
    pendingKeys.add(key);
    created += 1;
  }
  if (directorySources.length > 0) {
    await prisma.directorySource.updateMany({
      where: { id: { in: directorySources.map((source) => source.id) } },
      data: { lastCrawledAt: new Date() },
    });
  }

  for (let i = 0; i < partners.length; i++) {
    const partner = partners[i]!;
    await updateJob(jobId, {
      progress: Math.round((i / partners.length) * 100),
      progressNote: `${partner.name} を調査中`,
    });

    if (!partner.url) {
      notes.push(`${partner.name}: 公式サイトなし`);
      continue;
    }

    const collected = await collectSitePages(partner.url);
    notes.push(...collected.notes.map((note) => `${partner.name}: ${note}`));
    const pageText = collected.pages.map((page) => `${page.url}\n${page.text}`).join("\n");

    try {
      const extracted = await runNodeDiscover({
        partnerName: partner.name,
        prefecture: partner.prefecture,
        url: partner.url,
        targetPrefectures: partner.targetPrefectures,
        pages: collected.pages,
      });
      if (extracted.insufficient && extracted.nodes.length === 0) {
        insufficient += 1;
        notes.push(`${partner.name}: 根拠不足`);
        continue;
      }
      for (const item of extracted.nodes) {
        const key = `${partner.id}:${normalizeNodeName(item.name)}`;
        if (pendingKeys.has(key)) {
          skipped += 1;
          continue;
        }
        const sourcePage = collected.pages.find((page) => page.id === item.sourcePageId);
        const rosterUrl = item.rosterUrl && urlAppearsInText(item.rosterUrl, `${pageText}\n${partner.url ?? ""}`)
          ? item.rosterUrl
          : null;
        const matched = findMatchingNode({ name: item.name, rosterUrl }, existingNodes);
        await prisma.nodeProposal.create({
          data: {
            partnerId: partner.id,
            jobRunId: jobId,
            name: item.name,
            nodeType: item.nodeType,
            rosterUrl,
            evidenceText: item.evidenceText,
            confidence: item.confidence,
            matchedNodeId: matched?.id ?? null,
            discoveryMethod: "partner_site",
            relationType: item.relationType,
            sourceUrl: sourcePage?.url ?? partner.url,
            evidenceStrength: "explicit",
            modelVersion: extracted.modelVersion,
          },
        });
        pendingKeys.add(key);
        created += 1;
      }
    } catch (error) {
      notes.push(`${partner.name}: ${error instanceof Error ? error.message : "提案に失敗"}`);
    }
    await sleep(1500);
  }

  await updateJob(jobId, {
    status: "completed",
    progress: 100,
    progressNote: `提案 ${created} 件（重複スキップ ${skipped} / 根拠不足 ${insufficient}）`,
    result: { created, skipped, insufficient, notes, skill: "node-discover", provider: "gemini" },
    finishedAt: new Date(),
  });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "ノード提案に失敗しました",
      finishedAt: new Date(),
    });
  }
}

export async function dispatchJob(jobId: string, jobType: string, payload: Record<string, unknown>) {
  switch (jobType) {
    case "roster_crawl":
      await runRosterCrawlJob(jobId);
      break;
    case "signal_extract":
      await runSignalExtractJob(jobId, payload.companyId as string | undefined);
      break;
    case "score_recalc":
      await runScoreRecalcJob(jobId);
      break;
    case "node_discovery":
      await runNodeDiscoveryJob(jobId, payload.partnerId as string | undefined);
      break;
    case "ledger_update":
      await runLedgerUpdateJob(jobId);
      break;
    default:
      await updateJob(jobId, {
        status: "failed",
        errorMessage: `Unknown job type: ${jobType}`,
        finishedAt: new Date(),
      });
  }
}
