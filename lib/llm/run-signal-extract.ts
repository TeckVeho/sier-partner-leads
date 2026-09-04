import { formatModelVersion, requireLlmConfigured, SIGNAL_SKILL_ID, SITE_TEXT_LIMIT } from "@/lib/llm/config";
import { completeJson } from "@/lib/llm/client";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { parseSignalExtractJson, type SignalExtractResult } from "@/lib/llm/schemas";

export async function runSignalExtract(input: {
  companyName: string;
  url: string;
  text: string;
}): Promise<SignalExtractResult> {
  await requireLlmConfigured();
  const clipped = input.text.slice(0, SITE_TEXT_LIMIT);
  const skill = stripSkillFrontmatter(loadSkillMarkdown("signal-extract"));
  const user = `会社名: ${input.companyName}
URL: ${input.url}

--- サイト本文 ---
${clipped}`;

  const parsed = parseSignalExtractJson(await completeJson(skill, user));
  return {
    ...parsed,
    fallback: false,
    modelVersion: formatModelVersion(SIGNAL_SKILL_ID),
  };
}
