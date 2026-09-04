export type GeminiSchema = Record<string, unknown>;

const SIGNAL_TYPES = [
  "legacy_asset",
  "stock_revenue",
  "crisis_awareness",
  "ai_inhouse",
  "subsidiary",
  "customer_overlap",
];

const BUSINESS_MODELS = ["contracting", "product", "staffing", "mixed", "unknown"];
const NODE_TYPES = ["vendor", "association", "financial"];
const RELATION_TYPES = ["member", "certified_partner", "reseller", "bank_relation"];

export const SIGNAL_EXTRACT_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    signals: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          signalType: { type: "STRING", enum: SIGNAL_TYPES },
          sourcePageId: { type: "STRING" },
          evidenceQuote: { type: "STRING" },
          reason: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["signalType", "sourcePageId", "evidenceQuote", "reason", "confidence"],
      },
    },
    profile: {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        businessModel: { type: "STRING", enum: BUSINESS_MODELS },
        offerings: { type: "ARRAY", items: { type: "STRING" } },
        customers: { type: "STRING" },
        techAssets: { type: "STRING" },
        changeSignals: { type: "STRING" },
        cautions: { type: "STRING" },
        establishedYear: { type: "STRING" },
        employeeScale: { type: "STRING" },
        evidenceText: { type: "STRING" },
        sourcePageId: { type: "STRING" },
        insufficient: { type: "BOOLEAN" },
      },
      required: [
        "summary",
        "businessModel",
        "offerings",
        "customers",
        "techAssets",
        "changeSignals",
        "cautions",
        "establishedYear",
        "employeeScale",
        "evidenceText",
        "insufficient",
      ],
    },
    insufficient: { type: "BOOLEAN" },
    notes: { type: "STRING" },
  },
  required: ["signals", "profile", "insufficient", "notes"],
};

export const INTRO_DRAFT_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    companyBlurb: { type: "STRING" },
    whyAsk: { type: "STRING" },
  },
  required: ["companyBlurb", "whyAsk"],
};

export const NODE_DISCOVER_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    nodes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          nodeType: { type: "STRING", enum: NODE_TYPES },
          relationType: { type: "STRING", enum: RELATION_TYPES },
          rosterUrl: { type: "STRING" },
          sourcePageId: { type: "STRING" },
          evidenceQuote: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["name", "nodeType", "relationType", "sourcePageId", "evidenceQuote", "confidence"],
      },
    },
    insufficient: { type: "BOOLEAN" },
    notes: { type: "STRING" },
  },
  required: ["nodes", "insufficient", "notes"],
};
