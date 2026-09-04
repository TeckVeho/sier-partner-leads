const FORBIDDEN = [
  /ICP/i,
  /経路スコア/,
  /優先度\s*[ABC]/,
  /採点/,
  /breakdown/i,
  /relationshipNote/i,
  /社内メモ/,
  /内部メモ/,
];

export function findInternalLeak(text: string, extras: string[] = []) {
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) return pattern.source;
  }
  for (const extra of extras) {
    const needle = extra.trim();
    if (needle.length >= 8 && text.includes(needle)) return needle.slice(0, 40);
  }
  return null;
}

export function buildIntroDraft(input: {
  partnerName: string;
  companyName: string;
  location: string;
  nodeName: string;
  nodeTypeLabel: string;
  companyBlurb: string;
  whyAsk: string;
}) {
  const blurb = input.companyBlurb.trim();
  const why = input.whyAsk.trim();
  const body = [
    "【AI下書き・未送信】",
    "",
    `${input.partnerName} 御中`,
    "",
    "お世話になっております。",
    "候補企業への紹介可否を確認したく、下書きをお送りします。送信前に内容をご確認ください。",
    "",
    `候補企業: ${input.companyName}`,
    `所在地: ${input.location || "不明"}`,
    `経由: ${input.nodeName}（${input.nodeTypeLabel}）`,
    "",
    blurb,
    why,
    "",
    "ご存知の範囲で構いません。紹介可否、または担当者の有無だけでも教えていただけると助かります。",
    "本メールは未送信の下書きです。",
  ]
    .filter((line, index, rows) => !(line === "" && rows[index - 1] === ""))
    .join("\n");
  return body;
}
