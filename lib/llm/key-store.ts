import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const GEMINI_SETTING_KEY = "gemini_api_key";

type EncryptedPayload = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function material() {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET が未設定です");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(plain: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", material(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}

function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv("aes-256-gcm", material(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8");
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.v === 1 && typeof row.iv === "string" && typeof row.tag === "string" && typeof row.data === "string";
}

let cached: { key: string; source: "settings" | "env" | null; at: number } | null = null;
const CACHE_MS = 15_000;

export function clearGeminiKeyCache() {
  cached = null;
}

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

export async function readStoredGeminiKey(): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key: GEMINI_SETTING_KEY } });
  if (!row || !isEncryptedPayload(row.value)) return "";
  try {
    return decryptSecret(row.value).trim();
  } catch {
    return "";
  }
}

export async function writeStoredGeminiKey(plain: string) {
  const key = plain.trim();
  await prisma.systemSetting.upsert({
    where: { key: GEMINI_SETTING_KEY },
    update: { value: encryptSecret(key) },
    create: { key: GEMINI_SETTING_KEY, value: encryptSecret(key) },
  });
  clearGeminiKeyCache();
}

export async function deleteStoredGeminiKey() {
  await prisma.systemSetting.deleteMany({ where: { key: GEMINI_SETTING_KEY } });
  clearGeminiKeyCache();
}

export async function resolveGeminiApiKey(): Promise<{ key: string; source: "settings" | "env" | null }> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { key: cached.key, source: cached.source };
  }
  const stored = await readStoredGeminiKey();
  if (stored) {
    cached = { key: stored, source: "settings", at: Date.now() };
    return { key: stored, source: "settings" };
  }
  const fromEnv = process.env.GEMINI_API_KEY?.trim() || "";
  cached = { key: fromEnv, source: fromEnv ? "env" : null, at: Date.now() };
  return { key: fromEnv, source: fromEnv ? "env" : null };
}
