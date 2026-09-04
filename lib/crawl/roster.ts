import { normalizeCompanyName } from "@/lib/company/normalize";
import { detectPrefecture } from "@/lib/geo/prefectures";
import { htmlToText } from "@/lib/html";

export type RosterEntry = {
  name: string;
  prefecture: string | null;
  city: string | null;
  website: string | null;
  rawLine: string;
};

const COMPANY_PATTERN =
  /(?:株式会社|有限会社|合同会社|\(株\)|（株）).{2,40}|[一-龥ぁ-んァ-ヶー0-9A-Za-z・\-]{2,30}(?:株式会社|有限会社)/g;

export function extractRosterEntries(
  html: string,
  _sourceUrl?: string,
  _targetPrefectures?: string[],
): RosterEntry[] {
  const text = htmlToText(html);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: RosterEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const pref = detectPrefecture(line);
    if (!pref) continue;

    const matches = line.match(COMPANY_PATTERN) ?? [];
    for (const name of matches) {
      const key = normalizeCompanyName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      entries.push({
        name: name.trim(),
        prefecture: pref,
        city: null,
        website: guessWebsiteFromHtml(html, name) ?? null,
        rawLine: line,
      });
    }
  }

  if (entries.length === 0) {
    for (const match of text.matchAll(COMPANY_PATTERN)) {
      const name = match[0].trim();
      const key = normalizeCompanyName(name);
      if (!key || seen.has(key)) continue;
      const contextStart = Math.max(0, (match.index ?? 0) - 40);
      const context = text.slice(contextStart, (match.index ?? 0) + 80);
      const pref = detectPrefecture(context);
      if (!pref) continue;
      seen.add(key);
      entries.push({
        name,
        prefecture: pref,
        city: null,
        website: guessWebsiteFromHtml(html, name),
        rawLine: context.trim(),
      });
    }
  }

  return entries.filter((e) => Boolean(e.prefecture));
}

function guessWebsiteFromHtml(html: string, companyName: string): string | null {
  const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`href=["'](https?:\\/\\/[^"']+)["'][^>]*>[\\s\\S]{0,80}${escaped}`, "i");
  const match = html.match(re);
  if (match) return match[1];
  return null;
}

export function extractSiteSignals(text: string) {
  const lowered = text.toLowerCase();
  const signals: Array<{
    signalType: string;
    polarity: "positive" | "negative" | "exclusion";
    evidenceText: string;
  }> = [];

  const legacyKeywords = ["cobol", "vb", "access", "オフコン", "オンプレ", "保守", "運用保守", "受託開発"];
  for (const kw of legacyKeywords) {
    if (lowered.includes(kw.toLowerCase()) || text.includes(kw)) {
      signals.push({
        signalType: "legacy_asset",
        polarity: "positive",
        evidenceText: `サイト内に「${kw}」に関する記述があります。`,
      });
      break;
    }
  }

  if (/保守|運用契約|ストック/.test(text)) {
    signals.push({
      signalType: "stock_revenue",
      polarity: "positive",
      evidenceText: "保守・運用契約に関する記述があります。",
    });
  }

  if (/新規事業|提案力|脱・下請け|中期経営|dx/i.test(text)) {
    signals.push({
      signalType: "crisis_awareness",
      polarity: "positive",
      evidenceText: "危機意識・変革に関する記述があります。",
    });
  }

  const aiKeywords = ["生成ai", "chatgpt", "生成系ai", "内製開発", "ai開発"];
  if (aiKeywords.some((k) => lowered.includes(k))) {
    signals.push({
      signalType: "ai_inhouse",
      polarity: "exclusion",
      evidenceText: "自社での生成AI・内製開発に関する記述があります。",
    });
  }

  return signals;
}
