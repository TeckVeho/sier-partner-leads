import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { createIntroRequest } from "@/lib/intro/generate";
import { findIntroPaths } from "@/lib/intro/paths";
import { isLlmConfigured } from "@/lib/llm/config";

export type AutoDraftResult = {
  eligible: number;
  drafted: number;
  skippedNoPath: number;
  skippedExisting: number;
  failed: number;
  failedNotes: string[];
};

export async function autoDraftPriorityAIntros(options: {
  companyId?: string;
  onProgress?: (done: number, total: number, note: string) => Promise<void>;
} = {}): Promise<AutoDraftResult> {
  const result: AutoDraftResult = {
    eligible: 0,
    drafted: 0,
    skippedNoPath: 0,
    skippedExisting: 0,
    failed: 0,
    failedNotes: [],
  };

  const companies = await prisma.company.findMany({
    where: {
      status: "candidate",
      ...(options.companyId ? { id: options.companyId } : {}),
    },
    select: {
      id: true,
      name: true,
      scores: { orderBy: { calculatedAt: "desc" }, take: 1, select: { priority: true } },
      introRequests: { where: { status: { in: ["draft", "approved"] } }, select: { id: true } },
    },
  });

  const priorityA = companies.filter((company) => company.scores[0]?.priority === "A");
  const targets = priorityA.filter((company) => company.introRequests.length === 0);
  result.skippedExisting = priorityA.length - targets.length;
  result.eligible = targets.length;

  if (targets.length === 0) {
    await options.onProgress?.(0, 0, "対象なし");
    return result;
  }

  if (!(await isLlmConfigured())) {
    result.failed = targets.length;
    result.failedNotes.push("Gemini のキーが未設定のため依頼下書きをスキップしました");
    await options.onProgress?.(0, targets.length, result.failedNotes[0]);
    return result;
  }

  for (const [index, company] of targets.entries()) {
    await options.onProgress?.(index, targets.length, `${company.name} の依頼下書きを作成中`);
    try {
      const paths = await findIntroPaths(company.id);
      const best = paths[0];
      if (!best) {
        result.skippedNoPath += 1;
        continue;
      }

      const request = await createIntroRequest({
        companyId: company.id,
        viaPartnerId: best.partnerId,
        viaNodeId: best.nodeId,
      });
      await writeAuditLog({
        action: "create",
        entityType: "intro_request",
        entityId: request.id,
        after: { ...request, source: "auto_priority_a" },
      });
      result.drafted += 1;
    } catch (error) {
      result.failed += 1;
      result.failedNotes.push(
        `${company.name}: ${error instanceof Error ? error.message : "依頼下書きに失敗"}`,
      );
    }
  }

  await options.onProgress?.(
    targets.length,
    targets.length,
    result.eligible === 0
      ? "対象なし"
      : `下書き ${result.drafted} 件 / 経路なしスキップ ${result.skippedNoPath} 件`,
  );
  return result;
}

export function formatIntroDraftNote(intro: AutoDraftResult) {
  if (intro.eligible === 0) return "対象なし";
  return `下書き ${intro.drafted} 件 / 経路なしスキップ ${intro.skippedNoPath} 件`;
}
