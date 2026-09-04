import { requireLlmConfigured } from "@/lib/llm/config";
import { completeStructured } from "@/lib/llm/client";
import { NODE_DISCOVER_SCHEMA } from "@/lib/llm/gemini-schemas";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { applyNodeEvidence, parseNodeDiscoverJson, type NodeDiscoverResult } from "@/lib/llm/schemas";
import { skillModelVersion } from "@/lib/llm/skill-version";
import { formatPagesForPrompt, type EvidencePage } from "@/lib/text/evidence";

export async function runNodeDiscover(input: {
  partnerName: string;
  prefecture: string | null;
  url: string | null;
  targetPrefectures: string[];
  pages: EvidencePage[];
}): Promise<NodeDiscoverResult & { modelVersion: string }> {
  await requireLlmConfigured();
  const markdown = loadSkillMarkdown("node-discover");
  const skill = stripSkillFrontmatter(markdown);
  const user = `パートナー名: ${input.partnerName}
所在地: ${input.prefecture ?? "不明"}
対象エリア: ${input.targetPrefectures.join("・") || "未設定"}
公式サイト: ${input.url ?? "なし"}

--- 公開ページ ---
${formatPagesForPrompt(input.pages)}`;

  const parsed = applyNodeEvidence(
    parseNodeDiscoverJson(await completeStructured(skill, user, NODE_DISCOVER_SCHEMA)),
    input.pages,
  );
  return {
    ...parsed,
    modelVersion: skillModelVersion("node-discover", markdown),
  };
}
