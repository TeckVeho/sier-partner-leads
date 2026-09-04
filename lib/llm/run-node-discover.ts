import { formatModelVersion, NODE_DISCOVER_SKILL_ID, requireLlmConfigured, SITE_TEXT_LIMIT } from "@/lib/llm/config";
import { completeJson } from "@/lib/llm/client";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { parseNodeDiscoverJson, type NodeDiscoverResult } from "@/lib/llm/schemas";

export async function runNodeDiscover(input: {
  partnerName: string;
  prefecture: string | null;
  url: string | null;
  targetPrefectures: string[];
  relationshipNote: string | null;
  text: string;
}): Promise<NodeDiscoverResult & { modelVersion: string }> {
  await requireLlmConfigured();
  const skill = stripSkillFrontmatter(loadSkillMarkdown("node-discover"));
  const clipped = input.text.slice(0, SITE_TEXT_LIMIT);
  const user = `パートナー名: ${input.partnerName}
所在地: ${input.prefecture ?? "不明"}
対象エリア: ${input.targetPrefectures.join("・") || "未設定"}
公式サイト: ${input.url ?? "なし"}
関係メモ: ${input.relationshipNote ?? "なし"}

--- サイト本文 ---
${clipped || "（本文なし）"}`;

  const parsed = parseNodeDiscoverJson(await completeJson(skill, user));
  return {
    ...parsed,
    modelVersion: formatModelVersion(NODE_DISCOVER_SKILL_ID),
  };
}
