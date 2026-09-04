import type {
  CompanyStatus,
  CrawlRunStatus,
  IntroRequestStatus,
  JobRunStatus,
  JobRunType,
  PipelineStage,
  Priority,
  SignalType,
} from "@prisma/client";

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  candidate: "候補",
  on_hold: "保留",
  excluded: "除外",
};

export const INTRO_STATUS_LABELS: Record<IntroRequestStatus, string> = {
  draft: "下書き",
  approved: "承認済",
  sent: "送信済",
  accepted: "受諾",
  declined: "辞退",
};

export const JOB_STATUS_LABELS: Record<JobRunStatus, string> = {
  pending: "待機中",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
};

export const JOB_TYPE_LABELS: Record<JobRunType, string> = {
  roster_crawl: "名簿クロール",
  signal_extract: "再調査",
  score_recalc: "スコア再計算",
  node_discovery: "ノード提案",
  ledger_update: "台帳更新",
};

export const NODE_TYPE_LABELS: Record<"vendor" | "association" | "financial", string> = {
  association: "協会",
  vendor: "ベンダー",
  financial: "金融",
};

export const PLAYBOOK_STEPS: Array<{
  key: "roster_crawl" | "signal_extract" | "score_recalc" | "intro_draft";
  label: string;
}> = [
  { key: "roster_crawl", label: "名簿クロール" },
  { key: "signal_extract", label: "再調査" },
  { key: "score_recalc", label: "スコア再計算" },
  { key: "intro_draft", label: "依頼下書き" },
];

export const CRAWL_STATUS_LABELS: Record<CrawlRunStatus, string> = {
  success: "成功",
  partial: "一部成功",
  failed: "失敗",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  A: "A 最優先",
  B: "B",
  C: "C 後回し",
  hold: "保留",
};

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  not_contacted: "未接触",
  requested: "依頼済",
  intro_obtained: "紹介獲得",
  first_contact: "初回接触",
  meeting: "商談",
  partnership: "提携",
  lost: "見送り",
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  legacy_asset: "レガシー保守基盤",
  stock_revenue: "ストック収益",
  crisis_awareness: "危機意識・変革",
  ai_inhouse: "自社生成AI・内製",
  subsidiary: "大手子会社",
  customer_overlap: "顧客層の競合",
};

export const SIGNAL_POLARITY_LABELS: Record<string, string> = {
  positive: "加点",
  negative: "減点",
  exclusion: "除外",
};

export const BUSINESS_MODEL_LABELS: Record<string, string> = {
  contracting: "受託",
  product: "プロダクト",
  staffing: "人材",
  mixed: "複合",
  unknown: "不明",
};

export function describeModelVersion(modelVersion?: string | null) {
  if (!modelVersion || modelVersion === "rules-v1" || modelVersion === "seed") {
    return "キーワード判定";
  }
  if (modelVersion.startsWith("manual-research")) return "手動調査";
  if (modelVersion.startsWith("signal-extract")) return "AI判定";
  return modelVersion;
}

export function describeModelName(modelVersion?: string | null) {
  if (!modelVersion) return null;
  const slash = modelVersion.lastIndexOf("/");
  return slash >= 0 ? modelVersion.slice(slash + 1) : modelVersion;
}

export const PIPELINE_ORDER: PipelineStage[] = [
  "not_contacted",
  "requested",
  "intro_obtained",
  "first_contact",
  "meeting",
  "partnership",
  "lost",
];
