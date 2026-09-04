import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SIGNAL_EVAL_CASES } from "../evals/signal-extract/dataset";
import { applySignalEvidence, parseSignalExtractJson } from "../lib/llm/schemas";
import { polarityForSignal } from "../lib/scoring/signal-polarity";
import { quoteAppearsInText } from "../lib/text/evidence";
import { findInternalLeak } from "../lib/intro/sanitize";
import { findHitsInRosterHtml } from "../lib/nodes/roster-reverse";

const errors: string[] = [];

function assert(cond: boolean, message: string) {
  if (!cond) errors.push(message);
}

function checkDatasetIntegrity() {
  assert(SIGNAL_EVAL_CASES.length >= 30 && SIGNAL_EVAL_CASES.length <= 50, `件数 ${SIGNAL_EVAL_CASES.length} が 30-50 の外`);
  for (const item of SIGNAL_EVAL_CASES) {
    for (const signal of item.expected.signals) {
      const found = item.pages.some((page) => quoteAppearsInText(signal.evidenceQuote, page.text));
      assert(found, `${item.id}: 正解引用が本文に無い (${signal.signalType})`);
    }
  }
}

function checkPolarity() {
  assert(polarityForSignal("legacy_asset") === "positive", "legacy polarity");
  assert(polarityForSignal("stock_revenue") === "positive", "stock polarity");
  assert(polarityForSignal("crisis_awareness") === "positive", "crisis polarity");
  assert(polarityForSignal("ai_inhouse") === "exclusion", "ai polarity");
  assert(polarityForSignal("subsidiary") === "exclusion", "subsidiary polarity");
  assert(polarityForSignal("customer_overlap") === "negative", "overlap polarity");
}

function checkEvidenceFilter() {
  const sample = SIGNAL_EVAL_CASES[0]!;
  const raw = {
    signals: [
      {
        signalType: "legacy_asset",
        polarity: "exclusion",
        sourcePageId: "PAGE_2",
        evidenceQuote: sample.expected.signals[0]!.evidenceQuote,
        reason: "ok",
        confidence: 0.9,
      },
      {
        signalType: "ai_inhouse",
        sourcePageId: "PAGE_1",
        evidenceQuote: "本文に存在しない捏造引用です",
        reason: "fake",
        confidence: 0.99,
      },
      {
        signalType: "stock_revenue",
        sourcePageId: "PAGE_2",
        evidenceQuote: sample.expected.signals[1]?.evidenceQuote ?? sample.expected.signals[0]!.evidenceQuote,
        reason: "low",
        confidence: 0.2,
      },
    ],
    profile: {
      summary: "群馬の受託会社",
      businessModel: "contracting",
      offerings: [],
      customers: "",
      techAssets: "",
      changeSignals: "",
      cautions: "",
      establishedYear: "",
      employeeScale: "",
      evidenceText: "",
      insufficient: false,
    },
    insufficient: false,
    notes: "",
  };
  const parsed = parseSignalExtractJson(raw);
  assert(parsed.signals[0]?.polarity === "positive", "LLM polarity を無視して固定すること");
  const filtered = applySignalEvidence(parsed, sample.pages);
  assert(filtered.signals.some((row) => row.signalType === "legacy_asset"), "実在引用は残す");
  assert(!filtered.signals.some((row) => row.signalType === "ai_inhouse"), "捏造引用は捨てる");
  assert(!filtered.signals.some((row) => row.signalType === "stock_revenue" && row.confidence < 0.75), "低confidenceは捨てる");
}

function checkIntroLeak() {
  assert(findInternalLeak("ICPスコアは80です") !== null, "ICP を検知");
  assert(findInternalLeak("優先度Aの案件です") !== null, "優先度を検知");
  assert(findInternalLeak("経路スコアが高いです") !== null, "経路スコアを検知");
  assert(findInternalLeak("地域の受託開発会社です") === null, "通常文は通す");
  assert(findInternalLeak("紹介をお願いします", ["社内だけが知る秘密メモです"]) === null, "本文に無いメモは検知しない");
  assert(findInternalLeak("社内だけが知る秘密メモです", ["社内だけが知る秘密メモです"]) !== null, "メモ断片を検知");
}

function checkRosterReverse() {
  const html = `
    <html><body>
      <p>群馬県 株式会社ダイセーSDC https://www.daisei-sdc.co.jp/</p>
      <p>群馬県 無関係商事</p>
    </body></html>
  `;
  const hits = findHitsInRosterHtml({
    html,
    source: {
      name: "群馬県情報サービス産業協会（GUSSIA）会員一覧",
      nodeType: "association",
      rosterUrl: "https://www.gussia.or.jp/member/",
      crawlEnabled: true,
      accessPolicy: "public",
    },
    partners: [{ id: "p1", name: "ダイセーSDC", url: "https://www.daisei-sdc.co.jp/" }],
    nodes: [{ id: "n1", name: "群馬県情報サービス産業協会（GUSSIA）会員一覧", rosterUrl: "https://www.gussia.or.jp/member/" }],
  });
  assert(hits.length === 1, "公式名簿からパートナーが1件当たること");
  assert(hits[0]?.matchedNodeId === "n1", "既存ノードに紐づくこと");
}

function writeJsonl() {
  const path = join(process.cwd(), "evals/signal-extract/dataset.jsonl");
  const body = SIGNAL_EVAL_CASES.map((item) => JSON.stringify(item)).join("\n") + "\n";
  writeFileSync(path, body);
  console.log(`wrote ${path}`);
}

checkDatasetIntegrity();
checkPolarity();
checkEvidenceFilter();
checkIntroLeak();
checkRosterReverse();
writeJsonl();

if (errors.length > 0) {
  console.error("FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const byCategory = SIGNAL_EVAL_CASES.reduce<Record<string, number>>((acc, item) => {
  acc[item.category] = (acc[item.category] ?? 0) + 1;
  return acc;
}, {});
console.log(`OK ${SIGNAL_EVAL_CASES.length} cases`, byCategory);
