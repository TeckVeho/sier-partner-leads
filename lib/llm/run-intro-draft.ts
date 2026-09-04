import { requireLlmConfigured } from "@/lib/llm/config";
import { completeStructured } from "@/lib/llm/client";
import { INTRO_DRAFT_SCHEMA } from "@/lib/llm/gemini-schemas";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { parseIntroDraftParts, type IntroDraftResult } from "@/lib/llm/schemas";
import { skillModelVersion } from "@/lib/llm/skill-version";
import { buildIntroDraft, findInternalLeak } from "@/lib/intro/sanitize";

export async function runIntroDraft(input: {
  companyName: string;
  partnerName: string;
  nodeName: string;
  nodeTypeLabel: string;
  prefecture?: string | null;
  city?: string | null;
  summary?: string | null;
  offerings?: string[];
  customers?: string | null;
}): Promise<IntroDraftResult> {
  await requireLlmConfigured();
  const markdown = loadSkillMarkdown("intro-draft");
  const skill = stripSkillFrontmatter(markdown);
  const location = [input.prefecture, input.city].filter(Boolean).join(" ");
  const user = `経由パートナー: ${input.partnerName}
経由ノード: ${input.nodeName}
ノード種別: ${input.nodeTypeLabel}
候補企業: ${input.companyName}
所在地: ${location || "不明"}
公開プロフィール: ${input.summary || "なし"}
取扱: ${(input.offerings ?? []).join(" / ") || "なし"}
顧客層: ${input.customers || "なし"}`;

  const fallbackBody = buildIntroDraft({
    partnerName: input.partnerName,
    companyName: input.companyName,
    location,
    nodeName: input.nodeName,
    nodeTypeLabel: input.nodeTypeLabel,
    companyBlurb: input.summary?.trim() || `${input.companyName} について、公開情報の範囲で紹介可否を確認したくご連絡しています。`,
    whyAsk: `${input.nodeName} のつながりから、ご存知かどうか伺いたくお願いします。`,
  });

  try {
    const parts = parseIntroDraftParts(await completeStructured(skill, user, INTRO_DRAFT_SCHEMA));
    const draftBody = buildIntroDraft({
      partnerName: input.partnerName,
      companyName: input.companyName,
      location,
      nodeName: input.nodeName,
      nodeTypeLabel: input.nodeTypeLabel,
      companyBlurb: parts.companyBlurb,
      whyAsk: parts.whyAsk,
    });
    const leak = findInternalLeak(draftBody);
    if (leak) {
      return {
        draftBody: fallbackBody,
        source: "template",
        fallback: true,
        modelVersion: skillModelVersion("intro-draft", markdown),
      };
    }
    return {
      draftBody,
      source: "llm",
      fallback: false,
      modelVersion: skillModelVersion("intro-draft", markdown),
    };
  } catch {
    return {
      draftBody: fallbackBody,
      source: "template",
      fallback: true,
      modelVersion: skillModelVersion("intro-draft", markdown),
    };
  }
}
