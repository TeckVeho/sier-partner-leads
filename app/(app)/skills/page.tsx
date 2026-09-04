import { listSkills } from "@/app/actions/skills";
import { getGeminiKeyStatus } from "@/app/actions/llm-settings";
import { SkillsClient } from "@/components/skills/SkillsClient";

export default async function SkillsPage() {
  const [skills, gemini] = await Promise.all([listSkills(), getGeminiKeyStatus()]);
  return <SkillsClient initialSkills={skills} gemini={gemini} />;
}
