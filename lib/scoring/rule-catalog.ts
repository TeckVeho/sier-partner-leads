export type RuleCatalogEntry = {
  label: string;
  description: string;
  axisLabel: "ICP適合度" | "経路強度";
};

export const SCORING_RULE_CATALOG: Record<string, RuleCatalogEntry> = {
  legacy_asset: {
    label: "レガシー保守基盤",
    description: "COBOL / オフコン / 保守運用など、レガシー資産を扱っている。必須条件。",
    axisLabel: "ICP適合度",
  },
  stock_revenue: {
    label: "ストック収益",
    description: "保守・運用契約など、継続的な収益構造がある。",
    axisLabel: "ICP適合度",
  },
  crisis_awareness: {
    label: "危機意識・変革意欲",
    description: "新規事業 / DX / 脱下請けなど、変革の危機感が見える。無い場合は ICP 減点。",
    axisLabel: "ICP適合度",
  },
  ai_inhouse: {
    label: "自社生成AI・内製開発",
    description: "自社で生成AIや内製開発を前面に打ち出している。除外条件。",
    axisLabel: "ICP適合度",
  },
  subsidiary: {
    label: "大手子会社",
    description: "大手 SIer の完全子会社など。除外条件。",
    axisLabel: "ICP適合度",
  },
  same_vendor_partner: {
    label: "同一ベンダー網",
    description: "奉行販売店など、同じベンダー網に所属している。",
    axisLabel: "経路強度",
  },
  same_pref_association: {
    label: "同一県協会",
    description: "同じ都道府県の情報サービス協会会員である。",
    axisLabel: "経路強度",
  },
  financial_matching: {
    label: "金融機関経由",
    description: "金融機関との接点・マッチング経由の紹介可能性。",
    axisLabel: "経路強度",
  },
  multi_node_bonus: {
    label: "複数ノード所属",
    description: "2つ以上のノードに所属している場合のボーナス（実際は件数 × 10 点）。",
    axisLabel: "経路強度",
  },
};

export const PRIORITY_MATRIX = [
  { icp: "高（70+）", path: "高（70+）", priority: "A 最優先" },
  { icp: "高", path: "中（40–69）", priority: "B" },
  { icp: "中（40–69）", path: "高", priority: "B" },
  { icp: "高", path: "低 / なし", priority: "C 後回し" },
  { icp: "中以下", path: "中以下", priority: "保留" },
] as const;

export function getRuleLabel(ruleKey: string) {
  return SCORING_RULE_CATALOG[ruleKey]?.label ?? ruleKey;
}

export function getRuleDescription(ruleKey: string) {
  return SCORING_RULE_CATALOG[ruleKey]?.description ?? "";
}
