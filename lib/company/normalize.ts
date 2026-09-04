export {
  detectPrefecture,
  DEFAULT_TARGET_PREFECTURES as TARGET_PREFECTURES,
} from "@/lib/geo/prefectures";

const LEGAL_SUFFIXES = [
  "株式会社",
  "有限会社",
  "合同会社",
  "(株)",
  "（株）",
  "(有)",
  "（有）",
  "㈱",
  "㈲",
];

export function normalizeCompanyName(name: string): string {
  let text = (name || "").trim().toLowerCase();
  text = text.replace(/[\s　]/g, "");
  for (const suffix of LEGAL_SUFFIXES) {
    text = text.replaceAll(suffix.toLowerCase(), "");
  }
  return text.replace(/[・.\-_ー−]/g, "");
}

export function normalizeWebsite(url: string): string {
  let raw = (url || "").trim();
  if (!raw) return "";
  if (!raw.includes("://")) raw = `https://${raw}`;
  try {
    const parsed = new URL(raw);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const path = parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return raw.toLowerCase();
  }
}
