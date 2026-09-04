import type { SignalPolarity, SignalType } from "@prisma/client";

export const SIGNAL_POLARITY: Record<SignalType, SignalPolarity> = {
  legacy_asset: "positive",
  stock_revenue: "positive",
  crisis_awareness: "positive",
  ai_inhouse: "exclusion",
  subsidiary: "exclusion",
  customer_overlap: "negative",
};

export const MIN_SIGNAL_CONFIDENCE = 0.75;

export function polarityForSignal(signalType: SignalType): SignalPolarity {
  return SIGNAL_POLARITY[signalType];
}
