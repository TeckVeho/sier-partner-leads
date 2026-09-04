import type { SignalType } from "@prisma/client";

export type EvalPage = {
  id: string;
  url: string;
  text: string;
};

export type ExpectedSignal = {
  signalType: SignalType;
  evidenceQuote: string;
};

export type SignalEvalCase = {
  id: string;
  companyName: string;
  category:
    | "legacy_clear"
    | "no_legacy"
    | "ai_boundary"
    | "subsidiary_boundary"
    | "stock_boundary"
    | "thin";
  pages: EvalPage[];
  expected: {
    signals: ExpectedSignal[];
    insufficient: boolean;
  };
};
