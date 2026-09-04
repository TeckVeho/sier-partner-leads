export type PrefectureRegion = {
  id: string;
  label: string;
  names: string[];
};

export const PREFECTURE_REGIONS: PrefectureRegion[] = [
  { id: "hokkaido", label: "北海道", names: ["北海道"] },
  { id: "tohoku", label: "東北", names: ["青森", "岩手", "宮城", "秋田", "山形", "福島"] },
  { id: "kanto", label: "関東", names: ["茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川"] },
  { id: "chubu", label: "中部", names: ["新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知"] },
  { id: "kinki", label: "近畿", names: ["三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"] },
  { id: "chugoku", label: "中国", names: ["鳥取", "島根", "岡山", "広島", "山口"] },
  { id: "shikoku", label: "四国", names: ["徳島", "香川", "愛媛", "高知"] },
  { id: "kyushu", label: "九州・沖縄", names: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"] },
];

export const ALL_PREFECTURES = PREFECTURE_REGIONS.flatMap((region) => region.names);

export const DEFAULT_TARGET_PREFECTURES = ["群馬", "栃木", "茨城"] as const;

const SUFFIXES = ["県", "府", "都", "道"] as const;

/** 長い別名を先に見る（「東京都」を「京都」より先に判定する） */
const DETECT_ALIASES: Array<{ name: string; alias: string }> = ALL_PREFECTURES.flatMap((name) => {
  const aliases = name === "北海道" ? ["北海道"] : [`${name}都`, `${name}府`, `${name}県`, `${name}道`, name];
  return aliases.map((alias) => ({ name, alias }));
}).sort((a, b) => b.alias.length - a.alias.length);

export function detectPrefecture(text: string): string | null {
  for (const { name, alias } of DETECT_ALIASES) {
    if (text.includes(alias)) return name;
  }
  return null;
}

export function mentionsPrefecture(text: string, prefectures: string[]): boolean {
  return prefectures.some((name) => {
    if (text.includes(name)) return true;
    return SUFFIXES.some((suffix) => text.includes(`${name}${suffix}`));
  });
}

export function isTargetPrefecture(prefecture: string | null, targets: string[]): boolean {
  if (!prefecture) return false;
  return targets.includes(prefecture);
}

export function parsePrefectureList(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_TARGET_PREFECTURES];
  const names = value.filter((item): item is string => typeof item === "string" && ALL_PREFECTURES.includes(item));
  return names.length > 0 ? names : [...DEFAULT_TARGET_PREFECTURES];
}
