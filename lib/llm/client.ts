import { getGeminiApiKey, getGeminiModel, isLlmConfigured, LLM_TIMEOUT_MS, requireLlmConfigured } from "@/lib/llm/config";
import { extractJsonPayload } from "@/lib/llm/schemas";

export { isLlmConfigured };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

async function completeOnce(system: string, user: string): Promise<string> {
  await requireLlmConfigured();
  const key = await getGeminiApiKey();
  const model = encodeURIComponent(getGeminiModel());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3072,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      throw new Error(body.error?.message ?? `Gemini HTTP ${res.status}`);
    }
    const text =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) {
      throw new Error(body.candidates?.[0]?.finishReason ? `Gemini の応答が空です（${body.candidates[0].finishReason}）` : "Gemini の応答が空です");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function completeJson(system: string, user: string): Promise<unknown> {
  try {
    return extractJsonPayload(await completeOnce(system, user));
  } catch (first) {
    try {
      return extractJsonPayload(
        await completeOnce(`${system}\n\n前回の出力は JSON として不正でした。JSON オブジェクトだけを返してください。`, user),
      );
    } catch {
      throw first instanceof Error ? first : new Error("Gemini の呼び出しに失敗しました");
    }
  }
}
