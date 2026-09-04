import { requireLlmConfigured } from "@/lib/llm/config";
import { completeStructured } from "@/lib/llm/client";
import { SIGNAL_EXTRACT_SCHEMA } from "@/lib/llm/gemini-schemas";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { applySignalEvidence, parseSignalExtractJson, type SignalExtractResult } from "@/lib/llm/schemas";
import { skillModelVersion } from "@/lib/llm/skill-version";
import { formatPagesForPrompt, type EvidencePage } from "@/lib/text/evidence";

export async function runSignalExtract(input: {
  companyName: string;
  url: string;
  pages: EvidencePage[];
}): Promise<SignalExtractResult> {
  await requireLlmConfigured();
  const markdown = loadSkillMarkdown("signal-extract");
  const skill = stripSkillFrontmatter(markdown);
  const user = `会社名: ${input.companyName}
公式サイト: ${input.url}

--- 公開ページ ---
${formatPagesForPrompt(input.pages)}`;

  const parsed = applySignalEvidence(
    parseSignalExtractJson(await completeStructured(skill, user, SIGNAL_EXTRACT_SCHEMA)),
    input.pages,
  );
  return {
    ...parsed,
    fallback: false,
    modelVersion: skillModelVersion("signal-extract", markdown),
  };
}
