import type { SignalPolarity, SignalType } from "@prisma/client";

export const SIGNAL_TYPES: SignalType[] = [
  "legacy_asset",
  "stock_revenue",
  "crisis_awareness",
  "ai_inhouse",
  "subsidiary",
  "customer_overlap",
];

export const SIGNAL_POLARITIES: SignalPolarity[] = ["positive", "negative", "exclusion"];

export const BUSINESS_MODELS = ["contracting", "product", "staffing", "mixed", "unknown"] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export type ExtractedSignal = {
  signalType: SignalType;
  polarity: SignalPolarity;
  evidenceText: string;
  confidence: number;
};

export type CompanyProfileExtract = {
  summary: string;
  businessModel: BusinessModel;
  offerings: string[];
  customers: string;
  techAssets: string;
  changeSignals: string;
  cautions: string;
  establishedYear: string;
  employeeScale: string;
  evidenceText: string;
  insufficient: boolean;
};

export type SignalExtractResult = {
  signals: ExtractedSignal[];
  profile: CompanyProfileExtract;
  insufficient: boolean;
  notes: string;
  fallback: boolean;
  modelVersion: string;
};

export type IntroDraftResult = {
  draftBody: string;
  source: "llm" | "template";
  fallback: boolean;
  modelVersion: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isSignalType(value: unknown): value is SignalType {
  return typeof value === "string" && (SIGNAL_TYPES as string[]).includes(value);
}

function isPolarity(value: unknown): value is SignalPolarity {
  return typeof value === "string" && (SIGNAL_POLARITIES as string[]).includes(value);
}

function isBusinessModel(value: unknown): value is BusinessModel {
  return typeof value === "string" && (BUSINESS_MODELS as readonly string[]).includes(value);
}

function asTrimmed(value: unknown) {
  return String(value ?? "").trim();
}

export function parseCompanyProfile(raw: unknown): CompanyProfileExtract {
  const obj = asRecord(raw);
  if (!obj) {
    return {
      summary: "",
      businessModel: "unknown",
      offerings: [],
      customers: "",
      techAssets: "",
      changeSignals: "",
      cautions: "",
      establishedYear: "",
      employeeScale: "",
      evidenceText: "",
      insufficient: true,
    };
  }

  const summary = asTrimmed(obj.summary);
  const offerings = Array.isArray(obj.offerings)
    ? obj.offerings.map((item) => asTrimmed(item)).filter(Boolean).slice(0, 8)
    : [];

  return {
    summary,
    businessModel: isBusinessModel(obj.businessModel) ? obj.businessModel : "unknown",
    offerings,
    customers: asTrimmed(obj.customers),
    techAssets: asTrimmed(obj.techAssets),
    changeSignals: asTrimmed(obj.changeSignals),
    cautions: asTrimmed(obj.cautions),
    establishedYear: asTrimmed(obj.establishedYear),
    employeeScale: asTrimmed(obj.employeeScale),
    evidenceText: asTrimmed(obj.evidenceText),
    insufficient: Boolean(obj.insufficient) || summary.length === 0,
  };
}

export function isUsableProfile(profile: CompanyProfileExtract) {
  return !profile.insufficient && profile.summary.length > 0;
}

export function parseSignalExtractJson(raw: unknown): Omit<SignalExtractResult, "fallback" | "modelVersion"> {
  const obj = asRecord(raw);
  if (!obj) throw new Error("シグナル抽出の JSON が不正です");

  const rows = Array.isArray(obj.signals) ? obj.signals : [];
  const signals: ExtractedSignal[] = [];

  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    if (!isSignalType(item.signalType) || !isPolarity(item.polarity)) continue;
    const evidence = String(item.evidenceText ?? "").trim();
    if (!evidence) continue;
    const confidence = Number(item.confidence);
    signals.push({
      signalType: item.signalType,
      polarity: item.polarity,
      evidenceText: evidence,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.7,
    });
  }

  return {
    signals,
    profile: parseCompanyProfile(obj.profile),
    insufficient: Boolean(obj.insufficient),
    notes: String(obj.notes ?? ""),
  };
}

export type NodeDiscoverItem = {
  name: string;
  nodeType: "vendor" | "association" | "financial";
  rosterUrl: string | null;
  evidenceText: string;
  confidence: number;
};

export type NodeDiscoverResult = {
  nodes: NodeDiscoverItem[];
  insufficient: boolean;
  notes: string;
};

const NODE_TYPES = ["vendor", "association", "financial"] as const;

export function parseNodeDiscoverJson(raw: unknown): NodeDiscoverResult {
  const obj = asRecord(raw);
  if (!obj) throw new Error("ノード提案の JSON が不正です");
  const rows = Array.isArray(obj.nodes) ? obj.nodes : [];
  const nodes: NodeDiscoverItem[] = [];
  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const name = String(item.name ?? "").trim();
    const evidenceText = String(item.evidenceText ?? "").trim();
    const nodeType = String(item.nodeType ?? "");
    if (!name || !evidenceText) continue;
    if (!(NODE_TYPES as readonly string[]).includes(nodeType)) continue;
    const confidence = Number(item.confidence);
    const rosterUrl = String(item.rosterUrl ?? "").trim() || null;
    nodes.push({
      name,
      nodeType: nodeType as NodeDiscoverItem["nodeType"],
      rosterUrl,
      evidenceText,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.7,
    });
  }
  return {
    nodes,
    insufficient: Boolean(obj.insufficient),
    notes: String(obj.notes ?? ""),
  };
}

export function parseIntroDraftJson(raw: unknown): string {
  const obj = asRecord(raw);
  if (!obj) throw new Error("依頼文の JSON が不正です");
  const draft = String(obj.draftBody ?? "").trim();
  if (!draft) throw new Error("依頼文が空です");
  return draft;
}

export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON が見つかりません");
  return JSON.parse(candidate.slice(start, end + 1));
}
