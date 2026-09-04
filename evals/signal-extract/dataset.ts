import type { SignalEvalCase } from "./types";

function page(id: string, company: string, slug: string, text: string) {
  return {
    id,
    url: `https://eval.example.jp/${company}/${slug}`,
    text,
  };
}

function caseOf(
  id: string,
  companyName: string,
  category: SignalEvalCase["category"],
  pages: SignalEvalCase["pages"],
  signals: SignalEvalCase["expected"]["signals"],
  insufficient = false,
): SignalEvalCase {
  return { id, companyName, category, pages, expected: { signals, insufficient } };
}

const LEGACY_CLEAR: SignalEvalCase[] = [
  caseOf("company-001", "上州システム", "legacy_clear", [
    page("PAGE_1", "joushu", "about", "上州システムは群馬県の受託開発会社です。従業員は48名です。"),
    page("PAGE_2", "joushu", "service", "基幹系ではCOBOLシステムの運用保守を行っています。保守契約を年間で更新しています。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "COBOLシステムの運用保守を行っています" },
    { signalType: "stock_revenue", evidenceQuote: "保守契約を年間で更新しています" },
  ]),
  caseOf("company-002", "両毛ソフト", "legacy_clear", [
    page("PAGE_1", "ryomo", "service", "オフコン資産の移行と、既存オフコンの運用保守を受託しています。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "既存オフコンの運用保守を受託しています" }]),
  caseOf("company-003", "桐生情報", "legacy_clear", [
    page("PAGE_1", "kiryu", "tech", "Visual Basic と Access で作られた社内システムの保守を継続しています。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "Visual Basic と Access で作られた社内システムの保守を継続しています" }]),
  caseOf("company-004", "高崎コンピュータ", "legacy_clear", [
    page("PAGE_1", "takasaki", "service", "オンプレミスの会計システムを顧客拠点で運用保守しています。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "オンプレミスの会計システムを顧客拠点で運用保守しています" }]),
  caseOf("company-005", "伊勢崎技研", "legacy_clear", [
    page("PAGE_1", "isesaki", "about", "製造業向けに受託の運用保守を20年続けています。レガシー基幹の改修が中心です。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "受託の運用保守を20年続けています" }]),
  caseOf("company-006", "前橋データ", "legacy_clear", [
    page("PAGE_1", "maebashi", "news", "中期経営計画で脱下請けを掲げています。"),
    page("PAGE_2", "maebashi", "service", "COBOLのバッチ処理と夜間運用を受託しています。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "COBOLのバッチ処理と夜間運用を受託しています" },
    { signalType: "crisis_awareness", evidenceQuote: "中期経営計画で脱下請けを掲げています" },
  ]),
  caseOf("company-007", "太田ソフトハウス", "legacy_clear", [
    page("PAGE_1", "ota", "service", "ホストコンピュータ連携とオンプレサーバーの運用保守を提供します。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "オンプレサーバーの運用保守を提供します" }]),
  caseOf("company-008", "館林電算", "legacy_clear", [
    page("PAGE_1", "tatebayashi", "service", "AS/400 と RPG 資産の保守、周辺の運用保守を行います。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "AS/400 と RPG 資産の保守、周辺の運用保守を行います" }]),
  caseOf("company-009", "沼田情報サービス", "legacy_clear", [
    page("PAGE_1", "numata", "service", "自治体向け住民システムの運用保守を受託しています。COBOL資産が残っています。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "運用保守を受託しています。COBOL資産が残っています" }]),
  caseOf("company-010", "渋川システムズ", "legacy_clear", [
    page("PAGE_1", "shibukawa", "service", "工場の生産管理をオンプレで構築し、その後の運用保守を継続しています。"),
  ], [{ signalType: "legacy_asset", evidenceQuote: "その後の運用保守を継続しています" }]),
];

const NO_LEGACY: SignalEvalCase[] = [
  caseOf("company-011", "クラウドワーク群馬", "no_legacy", [
    page("PAGE_1", "cwg", "about", "クラウドワーク群馬はAWS上の新規Web開発を専門とする会社です。保守は行いません。"),
  ], []),
  caseOf("company-012", "デザインラボ高崎", "no_legacy", [
    page("PAGE_1", "dl", "service", "UIデザインとフロントエンド実装を提供します。レガシー資産は扱いません。"),
  ], []),
  caseOf("company-013", "モバイル北関東", "no_legacy", [
    page("PAGE_1", "mbk", "service", "スマートフォンアプリの企画と開発が主力です。"),
  ], []),
  caseOf("company-014", "データ分析前橋", "no_legacy", [
    page("PAGE_1", "dap", "service", "データ分析とダッシュボード構築を請け負います。"),
  ], []),
  caseOf("company-015", "セキュリティ太田", "no_legacy", [
    page("PAGE_1", "secota", "service", "脆弱性診断とSOC監視のサービスを提供します。"),
  ], []),
  caseOf("company-016", "ネットワーク桐生", "no_legacy", [
    page("PAGE_1", "netkiryu", "service", "LAN構築と無線設計を行います。ソフトウェア保守はありません。"),
  ], []),
  caseOf("company-017", "EC支援伊勢崎", "no_legacy", [
    page("PAGE_1", "ecise", "service", "ECサイトの新規構築と広告運用を支援します。"),
  ], []),
  caseOf("company-018", "研修センター館林", "no_legacy", [
    page("PAGE_1", "kenshu", "about", "IT研修と資格講座を提供する教育事業者です。"),
  ], []),
];

const AI_BOUNDARY: SignalEvalCase[] = [
  caseOf("company-019", "内製AI研究所", "ai_boundary", [
    page("PAGE_1", "aiin", "service", "自社で生成AIプロダクトを内製開発し、SaaSとして販売しています。"),
  ], [{ signalType: "ai_inhouse", evidenceQuote: "自社で生成AIプロダクトを内製開発し" }]),
  caseOf("company-020", "自社LLM工房", "ai_boundary", [
    page("PAGE_1", "llm", "tech", "独自LLMを自社開発し、顧客へAPI提供しています。"),
  ], [{ signalType: "ai_inhouse", evidenceQuote: "独自LLMを自社開発し" }]),
  caseOf("company-021", "Chat導入支援社", "ai_boundary", [
    page("PAGE_1", "chat", "service", "ChatGPT を業務で使えるよう導入支援します。自社プロダクトはありません。"),
  ], []),
  caseOf("company-022", "生成AI対応商事", "ai_boundary", [
    page("PAGE_1", "genai", "service", "生成AIに対応します。他社製品の販売と設定代行が中心です。"),
  ], []),
  caseOf("company-023", "レガシーと内製AI", "ai_boundary", [
    page("PAGE_1", "both", "service", "COBOLシステムの運用保守を行っています。同時に自社で生成AIを内製開発しています。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "COBOLシステムの運用保守を行っています" },
    { signalType: "ai_inhouse", evidenceQuote: "自社で生成AIを内製開発しています" },
  ]),
  caseOf("company-024", "AI研修のみ", "ai_boundary", [
    page("PAGE_1", "aitrain", "service", "生成AIの社内研修を提供します。開発は行いません。"),
  ], []),
];

const SUBSIDIARY_BOUNDARY: SignalEvalCase[] = [
  caseOf("company-025", "大手完全子会社", "subsidiary_boundary", [
    page("PAGE_1", "sub1", "about", "当社は大手SIerの完全子会社です。親会社の案件を中心に受託しています。"),
  ], [{ signalType: "subsidiary", evidenceQuote: "大手SIerの完全子会社です" }]),
  caseOf("company-026", "メーカー100%子会社", "subsidiary_boundary", [
    page("PAGE_1", "sub2", "about", "親メーカーの100%子会社として情報システム部門を分社化しました。"),
  ], [{ signalType: "subsidiary", evidenceQuote: "親メーカーの100%子会社として" }]),
  caseOf("company-027", "グループ会社", "subsidiary_boundary", [
    page("PAGE_1", "grp", "about", "地域グループの一員として独立採算で運営しています。資本関係の詳細は未記載です。"),
  ], []),
  caseOf("company-028", "業務提携先", "subsidiary_boundary", [
    page("PAGE_1", "tieup", "about", "大手ベンダーと業務提携しています。子会社ではありません。"),
  ], []),
  caseOf("company-029", "レガシー子会社", "subsidiary_boundary", [
    page("PAGE_1", "legsub", "about", "当社は大手SIerの完全子会社です。COBOLシステムの運用保守を行っています。"),
  ], [
    { signalType: "subsidiary", evidenceQuote: "大手SIerの完全子会社です" },
    { signalType: "legacy_asset", evidenceQuote: "COBOLシステムの運用保守を行っています" },
  ]),
];

const STOCK_BOUNDARY: SignalEvalCase[] = [
  caseOf("company-030", "年間保守契約社", "stock_boundary", [
    page("PAGE_1", "stock1", "service", "導入後は年間の保守契約で問い合わせとパッチ適用を行います。オンプレの販売管理を運用保守しています。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "オンプレの販売管理を運用保守しています" },
    { signalType: "stock_revenue", evidenceQuote: "年間の保守契約で問い合わせとパッチ適用を行います" },
  ]),
  caseOf("company-031", "スポット改修社", "stock_boundary", [
    page("PAGE_1", "spot", "service", "依頼の都度スポットで改修します。継続契約はありません。新規Web開発が中心です。"),
  ], []),
  caseOf("company-032", "運用サービス社", "stock_boundary", [
    page("PAGE_1", "ops", "service", "月額の運用契約で監視と障害対応を提供します。オンプレ基幹の運用保守が主力です。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "オンプレ基幹の運用保守が主力です" },
    { signalType: "stock_revenue", evidenceQuote: "月額の運用契約で監視と障害対応を提供します" },
  ]),
  caseOf("company-033", "納品切り社", "stock_boundary", [
    page("PAGE_1", "cut", "service", "要件定義から納品までを一括で請け負い、保守は別見積です。クラウド新規開発です。"),
  ], []),
  caseOf("company-034", "ストックとDX", "stock_boundary", [
    page("PAGE_1", "dxstock", "about", "DX支援を掲げ、既存顧客の脱下請けを進めています。"),
    page("PAGE_2", "dxstock", "service", "COBOL保守と年間保守契約を組み合わせて提供しています。"),
  ], [
    { signalType: "legacy_asset", evidenceQuote: "COBOL保守と年間保守契約を組み合わせて提供しています" },
    { signalType: "stock_revenue", evidenceQuote: "年間保守契約を組み合わせて提供しています" },
    { signalType: "crisis_awareness", evidenceQuote: "DX支援を掲げ、既存顧客の脱下請けを進めています" },
  ]),
];

const THIN: SignalEvalCase[] = [
  caseOf("company-035", "準備中サイト", "thin", [
    page("PAGE_1", "prep", "index", "Coming soon"),
  ], [], true),
  caseOf("company-036", "短い会社", "thin", [
    page("PAGE_1", "short", "index", "お問い合わせはこちら"),
  ], [], true),
  caseOf("company-037", "JS依存社", "thin", [
    page("PAGE_1", "js", "index", "JavaScript を有効にしてください"),
  ], [], true),
  caseOf("company-038", "ロゴだけ社", "thin", [
    page("PAGE_1", "logo", "index", "Copyright 2026"),
  ], [], true),
  caseOf("company-039", "英語ナビのみ", "thin", [
    page("PAGE_1", "en", "index", "Home About Contact"),
  ], [], true),
  caseOf("company-040", "空に近い社", "thin", [
    page("PAGE_1", "empty", "index", "welcome"),
  ], [], true),
];

export const SIGNAL_EVAL_CASES: SignalEvalCase[] = [
  ...LEGACY_CLEAR,
  ...NO_LEGACY,
  ...AI_BOUNDARY,
  ...SUBSIDIARY_BOUNDARY,
  ...STOCK_BOUNDARY,
  ...THIN,
];
