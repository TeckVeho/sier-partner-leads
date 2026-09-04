import type { SignalPolarity, SignalType } from "@prisma/client";
import { MIN_SIGNAL_CONFIDENCE, polarityForSignal } from "@/lib/scoring/signal-polarity";
import { findEvidencePage, type EvidencePage } from "@/lib/text/evidence";

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
  sourcePageId: string | null;
  sourceUrl: string | null;
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
  sourcePageId: string;
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

export type IntroDraftParts = {
  companyBlurb: string;
  whyAsk: string;
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
      sourcePageId: "",
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
    sourcePageId: asTrimmed(obj.sourcePageId),
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
  const seen = new Set<SignalType>();

  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    if (!isSignalType(item.signalType)) continue;
    const evidence = asTrimmed(item.evidenceQuote || item.evidenceText);
    if (!evidence) continue;
    const confidence = Number(item.confidence);
    if (seen.has(item.signalType)) continue;
    seen.add(item.signalType);
    signals.push({
      signalType: item.signalType,
      polarity: polarityForSignal(item.signalType),
      evidenceText: evidence,
      sourcePageId: asTrimmed(item.sourcePageId) || null,
      sourceUrl: null,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    });
  }

  return {
    signals,
    profile: parseCompanyProfile(obj.profile),
    insufficient: Boolean(obj.insufficient),
    notes: String(obj.notes ?? ""),
  };
}

export function applySignalEvidence(
  parsed: Omit<SignalExtractResult, "fallback" | "modelVersion">,
  pages: EvidencePage[],
): Omit<SignalExtractResult, "fallback" | "modelVersion"> {
  const signals: ExtractedSignal[] = [];
  for (const signal of parsed.signals) {
    if (signal.confidence < MIN_SIGNAL_CONFIDENCE) continue;
    const page = findEvidencePage(pages, signal.sourcePageId, signal.evidenceText);
    if (!page) continue;
    signals.push({
      ...signal,
      sourcePageId: page.id,
      sourceUrl: page.url,
    });
  }

  let profile = parsed.profile;
  if (profile.evidenceText) {
    const page = findEvidencePage(pages, profile.sourcePageId || null, profile.evidenceText);
    if (!page) {
      profile = { ...profile, evidenceText: "", sourcePageId: "" };
    } else {
      profile = { ...profile, sourcePageId: page.id };
    }
  }

  const droppedAll = parsed.signals.length > 0 && signals.length === 0;
  const insufficient = parsed.insufficient || droppedAll || pages.length === 0;
  if (insufficient) {
    profile = { ...profile, insufficient: true };
  }

  return {
    signals: insufficient ? [] : signals,
    profile,
    insufficient,
    notes: parsed.notes,
  };
}

export type NodeDiscoverItem = {
  name: string;
  nodeType: "vendor" | "association" | "financial";
  relationType: "member" | "certified_partner" | "reseller" | "bank_relation";
  rosterUrl: string | null;
  sourcePageId: string | null;
  evidenceText: string;
  confidence: number;
};

export type NodeDiscoverResult = {
  nodes: NodeDiscoverItem[];
  insufficient: boolean;
  notes: string;
};

const NODE_TYPES = ["vendor", "association", "financial"] as const;
const RELATION_TYPES = ["member", "certified_partner", "reseller", "bank_relation"] as const;

export function parseNodeDiscoverJson(raw: unknown): NodeDiscoverResult {
  const obj = asRecord(raw);
  if (!obj) throw new Error("ノード提案の JSON が不正です");
  const rows = Array.isArray(obj.nodes) ? obj.nodes : [];
  const nodes: NodeDiscoverItem[] = [];
  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const name = asTrimmed(item.name);
    const evidenceText = asTrimmed(item.evidenceQuote || item.evidenceText);
    const nodeType = asTrimmed(item.nodeType);
    const relationType = asTrimmed(item.relationType) || "member";
    if (!name || !evidenceText) continue;
    if (!(NODE_TYPES as readonly string[]).includes(nodeType)) continue;
    if (!(RELATION_TYPES as readonly string[]).includes(relationType)) continue;
    const confidence = Number(item.confidence);
    const rosterUrl = asTrimmed(item.rosterUrl) || null;
    nodes.push({
      name,
      nodeType: nodeType as NodeDiscoverItem["nodeType"],
      relationType: relationType as NodeDiscoverItem["relationType"],
      rosterUrl,
      sourcePageId: asTrimmed(item.sourcePageId) || null,
      evidenceText,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    });
  }
  return {
    nodes,
    insufficient: Boolean(obj.insufficient),
    notes: String(obj.notes ?? ""),
  };
}

export function applyNodeEvidence(parsed: NodeDiscoverResult, pages: EvidencePage[]): NodeDiscoverResult {
  const nodes: NodeDiscoverItem[] = [];
  for (const item of parsed.nodes) {
    if (item.confidence < MIN_SIGNAL_CONFIDENCE) continue;
    const page = findEvidencePage(pages, item.sourcePageId, item.evidenceText);
    if (!page) continue;
    nodes.push({ ...item, sourcePageId: page.id });
  }
  return {
    nodes,
    insufficient: parsed.insufficient || (parsed.nodes.length > 0 && nodes.length === 0) || pages.length === 0,
    notes: parsed.notes,
  };
}

export function parseIntroDraftParts(raw: unknown): IntroDraftParts {
  const obj = asRecord(raw);
  if (!obj) throw new Error("依頼文の JSON が不正です");
  const companyBlurb = asTrimmed(obj.companyBlurb || obj.draftBody);
  const whyAsk = asTrimmed(obj.whyAsk);
  if (!companyBlurb && !whyAsk) throw new Error("依頼文が空です");
  return { companyBlurb, whyAsk };
}

export function parseIntroDraftJson(raw: unknown): string {
  const parts = parseIntroDraftParts(raw);
  return [parts.companyBlurb, parts.whyAsk].filter(Boolean).join("\n");
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
