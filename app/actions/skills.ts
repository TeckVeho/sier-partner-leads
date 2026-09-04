"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { isSkillId, listSkillRecords, loadSkillMarkdown, saveSkillMarkdown } from "@/lib/llm/load-skill";

const MAX_SKILL_CHARS = 80_000;

export async function listSkills() {
  await requireUser({ adminOnly: true });
  return listSkillRecords();
}

export async function saveSkill(skillId: string, content: string) {
  const user = await requireUser({ adminOnly: true });
  if (!isSkillId(skillId)) {
    throw new Error("未知のスキルです");
  }
  const markdown = content.replace(/\r\n/g, "\n").trim();
  if (!markdown) {
    throw new Error("スキル本文を空にはできません");
  }
  if (markdown.length > MAX_SKILL_CHARS) {
    throw new Error("スキルが長すぎます");
  }
  if (!markdown.startsWith("---")) {
    throw new Error("先頭に frontmatter（---）が必要です");
  }

  const before = loadSkillMarkdown(skillId);
  saveSkillMarkdown(skillId, `${markdown}\n`);
  const after = loadSkillMarkdown(skillId);

  await writeAuditLog({
    userId: user.id,
    action: "update",
    entityType: "skill",
    entityId: skillId,
    before: { content: before },
    after: { content: after },
  });

  revalidatePath("/skills");
  revalidatePath("/manual");
  return listSkillRecords().find((skill) => skill.id === skillId)!;
}
