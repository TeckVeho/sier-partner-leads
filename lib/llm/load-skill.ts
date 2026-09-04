import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SKILL_CATALOG = [
  {
    id: "signal-extract",
    title: "シグナル抽出",
    usedBy: "再調査 / 台帳更新（シグナルと調査メモ）",
    relativePath: "signal-extract/SKILL.md",
  },
  {
    id: "intro-draft",
    title: "紹介依頼の下書き",
    usedBy: "依頼下書き（公開情報の紹介理由。点数・社内メモは渡さない）",
    relativePath: "intro-draft/SKILL.md",
  },
  {
    id: "node-discover",
    title: "ノード提案",
    usedBy: "パートナーサイト複数ページと公式名簿逆引き",
    relativePath: "node-discover/SKILL.md",
  },
] as const;

export type SkillId = (typeof SKILL_CATALOG)[number]["id"];

const SKILL_FILES: Record<SkillId, string> = Object.fromEntries(
  SKILL_CATALOG.map((skill) => [skill.id, skill.relativePath]),
) as Record<SkillId, string>;

export function isSkillId(value: string): value is SkillId {
  return SKILL_CATALOG.some((skill) => skill.id === value);
}

export function getSkillDefinition(skillId: SkillId) {
  return SKILL_CATALOG.find((skill) => skill.id === skillId)!;
}

function skillCandidates(relative: string) {
  return [join(process.cwd(), "skills", relative), join(process.cwd(), "..", "skills", relative)];
}

export function resolveSkillPath(skillId: SkillId): string {
  const relative = SKILL_FILES[skillId];
  for (const file of skillCandidates(relative)) {
    if (existsSync(file)) return file;
  }
  return skillCandidates(relative)[0]!;
}

export function loadSkillMarkdown(skillName: SkillId): string {
  const relative = SKILL_FILES[skillName];
  const path = resolveSkillPath(skillName);
  if (!existsSync(path)) {
    throw new Error(`スキルファイルが見つかりません: ${relative}`);
  }
  return readFileSync(path, "utf-8");
}

export function saveSkillMarkdown(skillId: SkillId, markdown: string) {
  writeFileSync(resolveSkillPath(skillId), markdown, "utf-8");
}

export function parseSkillFrontmatter(markdown: string): { description: string; body: string } {
  if (!markdown.startsWith("---")) {
    return { description: "", body: markdown };
  }
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return { description: "", body: markdown };
  const raw = markdown.slice(3, end);
  const description =
    raw
      .split("\n")
      .map((line) => line.match(/^description:\s*(.*)$/))
      .find((match) => match)?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim() ?? "";
  return { description, body: markdown.slice(end + 4).trim() };
}

export function stripSkillFrontmatter(markdown: string): string {
  return parseSkillFrontmatter(markdown).body;
}

export function listSkillRecords() {
  return SKILL_CATALOG.map((skill) => {
    const content = loadSkillMarkdown(skill.id);
    const { description } = parseSkillFrontmatter(content);
    const path = resolveSkillPath(skill.id);
    const stat = existsSync(path) ? statSync(path) : null;
    return {
      id: skill.id,
      title: skill.title,
      usedBy: skill.usedBy,
      relativePath: `skills/${skill.relativePath}`,
      description,
      content,
      updatedAt: stat?.mtime.toISOString() ?? null,
    };
  });
}
