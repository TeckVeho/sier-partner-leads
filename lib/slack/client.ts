export async function sendSlackMessage(text: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_NOTIFY_CHANNEL ?? process.env.SLACK_DM_CHANNEL;
  if (!token || !channel) {
    console.info("[slack:skipped]", text);
    return { ok: true, skipped: true };
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error ?? "Slack API error");
  return body;
}

export function formatCandidateNotification(input: {
  companyName: string;
  prefecture?: string | null;
  city?: string | null;
  priority: string;
  rationale: string;
  url?: string;
}) {
  return `:mag: 新規パートナー候補（要確認）

*${input.companyName}*（${[input.prefecture, input.city].filter(Boolean).join("・") || "所在地不明"}）
優先度: ${input.priority}
${input.rationale}

${input.url ? `詳細: ${input.url}` : ""}

※最終判断は商談前に確認してください`;
}
