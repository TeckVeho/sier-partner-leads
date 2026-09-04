import { resolveGeminiApiKey } from "@/lib/llm/key-store";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const LLM_TIMEOUT_MS = 45_000;
export const SITE_TEXT_LIMIT = 12_000;
export const SIGNAL_SKILL_ID = "signal-extract@2026-09-04-profile";
export const INTRO_SKILL_ID = "intro-draft@2026-09-04";
export const NODE_DISCOVER_SKILL_ID = "node-discover@2026-09-04";
export const LLM_KEY_ERROR =
  "Gemini のキーが未設定です。スキル管理から登録するか、.env に GEMINI_API_KEY を置いてください。";

export async function getGeminiApiKey() {
  return (await resolveGeminiApiKey()).key;
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export async function isLlmConfigured() {
  return (await getGeminiApiKey()).length > 0;
}

export async function requireLlmConfigured() {
  if (!(await isLlmConfigured())) {
    throw new Error(LLM_KEY_ERROR);
  }
}

export function formatModelVersion(skillId: string) {
  return `${skillId}/${getGeminiModel()}`;
}
