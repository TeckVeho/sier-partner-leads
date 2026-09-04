"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { writeAuditLog } from "@/lib/audit";
import { deleteStoredGeminiKey, maskSecret, readStoredGeminiKey, resolveGeminiApiKey, writeStoredGeminiKey } from "@/lib/llm/key-store";

export type GeminiKeyStatus = {
  configured: boolean;
  source: "settings" | "env" | null;
  hint: string | null;
};

export async function getGeminiKeyStatus(): Promise<GeminiKeyStatus> {
  await requireUser({ adminOnly: true });
  const resolved = await resolveGeminiApiKey();
  const stored = await readStoredGeminiKey();
  const hintSource = stored || (resolved.source === "env" ? resolved.key : "");
  return {
    configured: resolved.key.length > 0,
    source: resolved.source,
    hint: hintSource ? maskSecret(hintSource) : null,
  };
}

export async function saveGeminiKey(input: string) {
  const user = await requireUser({ adminOnly: true });
  const key = input.trim();
  if (key.length < 16) {
    throw new Error("キーが短すぎます");
  }
  await writeStoredGeminiKey(key);
  await writeAuditLog({
    userId: user.id,
    action: "update",
    entityType: "system_setting",
    entityId: "gemini_api_key",
    after: { configured: true, hint: maskSecret(key) },
  });
  revalidatePath("/skills");
  revalidatePath("/dashboard");
  revalidatePath("/nodes");
  return getGeminiKeyStatus();
}

export async function clearGeminiKey() {
  const user = await requireUser({ adminOnly: true });
  await deleteStoredGeminiKey();
  await writeAuditLog({
    userId: user.id,
    action: "delete",
    entityType: "system_setting",
    entityId: "gemini_api_key",
    after: { configured: false },
  });
  revalidatePath("/skills");
  revalidatePath("/dashboard");
  revalidatePath("/nodes");
  return getGeminiKeyStatus();
}
