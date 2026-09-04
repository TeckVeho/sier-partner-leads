import { createHash } from "node:crypto";
import { formatModelVersion } from "@/lib/llm/config";
import { loadSkillMarkdown, type SkillId } from "@/lib/llm/load-skill";

export function hashSkillMarkdown(markdown: string) {
  return createHash("sha256").update(markdown).digest("hex").slice(0, 12);
}

export function skillModelVersion(skillId: SkillId, markdown?: string) {
  const content = markdown ?? loadSkillMarkdown(skillId);
  return formatModelVersion(`${skillId}@${hashSkillMarkdown(content)}`);
}
