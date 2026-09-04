import { formatModelVersion, INTRO_SKILL_ID, requireLlmConfigured } from "@/lib/llm/config";
import { completeJson } from "@/lib/llm/client";
import { loadSkillMarkdown, stripSkillFrontmatter } from "@/lib/llm/load-skill";
import { parseIntroDraftJson, type IntroDraftResult } from "@/lib/llm/schemas";

export async function runIntroDraft(input: {
  companyName: string;
  partnerName: string;
  partnerNote?: string | null;
  nodeName: string;
  prefecture?: string | null;
  city?: string | null;
  priority?: string | null;
  icpScore?: number | null;
  pathScore?: number | null;
}): Promise<IntroDraftResult> {
  await requireLlmConfigured();
  const skill = stripSkillFrontmatter(loadSkillMarkdown("intro-draft"));
  const user = `経由パートナー: ${input.partnerName}
パートナーメモ: ${input.partnerNote || "なし"}
経由ノード: ${input.nodeName}
候補企業: ${input.companyName}
所在地: ${[input.prefecture, input.city].filter(Boolean).join(" ") || "不明"}
優先度: ${input.priority ?? "未設定"}
ICPスコア: ${input.icpScore ?? "未採点"}
経路スコア: ${input.pathScore ?? "未採点"}`;

  const draftBody = parseIntroDraftJson(await completeJson(skill, user));
  const prefixed = draftBody.startsWith("【AI下書き") ? draftBody : `【AI下書き・未送信】\n${draftBody}`;
  return {
    draftBody: prefixed,
    source: "llm",
    fallback: false,
    modelVersion: formatModelVersion(INTRO_SKILL_ID),
  };
}
