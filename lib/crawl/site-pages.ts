import { fetchHtml, sleep } from "@/lib/crawl/fetcher";
import { isRobotsAllowed } from "@/lib/crawl/robots";
import { isSafePublicHttpUrl, isSameOrigin, isSkippableAssetUrl } from "@/lib/crawl/url-safety";
import { extractAnchors, htmlToText } from "@/lib/html";
import { SITE_PAGE_CHAR_LIMIT, SITE_PAGE_LIMIT, SITE_TOTAL_CHAR_LIMIT } from "@/lib/llm/config";
import type { EvidencePage } from "@/lib/text/evidence";

const PAGE_HINTS: Array<{ weight: number; patterns: RegExp[] }> = [
  { weight: 40, patterns: [/会社概要/, /企業情報/, /会社案内/, /about/, /company/, /corporate/, /outline/] },
  { weight: 35, patterns: [/事業/, /サービス/, /ソリューション/, /service/, /solution/, /business/] },
  { weight: 20, patterns: [/採用/, /recruit/, /career/, /技術/] },
  { weight: 15, patterns: [/ニュース/, /news/, /中期/, /ir/, /トピックス/] },
  { weight: 10, patterns: [/パートナー/, /認定/, /資格/, /加盟/, /沿革/, /history/] },
];

export type CollectedPages = {
  pages: EvidencePage[];
  notes: string[];
};

function scoreCandidate(href: string, text: string) {
  const hay = `${href} ${text}`.toLowerCase();
  let score = 0;
  for (const hint of PAGE_HINTS) {
    if (hint.patterns.some((pattern) => pattern.test(hay))) score += hint.weight;
  }
  return score;
}

function clip(text: string) {
  return text.slice(0, SITE_PAGE_CHAR_LIMIT);
}

export async function collectSitePages(startUrl: string): Promise<CollectedPages> {
  const notes: string[] = [];
  if (!isSafePublicHttpUrl(startUrl)) {
    return { pages: [], notes: ["公開HTTP(S) URLではありません"] };
  }
  if (!(await isRobotsAllowed(startUrl))) {
    return { pages: [], notes: ["robots.txt により取得不可"] };
  }

  let topHtml: string;
  try {
    topHtml = await fetchHtml(startUrl);
  } catch (error) {
    return { pages: [], notes: [error instanceof Error ? error.message : "トップページ取得失敗"] };
  }

  const pages: EvidencePage[] = [];
  const seen = new Set<string>();
  let remaining = SITE_TOTAL_CHAR_LIMIT;

  const pushPage = (url: string, html: string) => {
    const text = clip(htmlToText(html));
    if (text.length < 80) return;
    if (seen.has(url)) return;
    const usable = text.slice(0, remaining);
    if (usable.length < 80) return;
    seen.add(url);
    pages.push({ id: `PAGE_${pages.length + 1}`, url, text: usable });
    remaining -= usable.length;
  };

  pushPage(startUrl, topHtml);

  const ranked = extractAnchors(topHtml, startUrl)
    .map((anchor) => ({ ...anchor, score: scoreCandidate(anchor.href, anchor.text) }))
    .filter((anchor) => {
      if (anchor.score <= 0) return false;
      if (!isSafePublicHttpUrl(anchor.href)) return false;
      if (!isSameOrigin(startUrl, anchor.href)) return false;
      if (isSkippableAssetUrl(anchor.href)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  for (const candidate of ranked) {
    if (pages.length >= SITE_PAGE_LIMIT || remaining < 80) break;
    if (seen.has(candidate.href)) continue;
    if (!(await isRobotsAllowed(candidate.href))) {
      notes.push(`${candidate.href}: robots.txt により取得不可`);
      continue;
    }
    try {
      await sleep(400);
      pushPage(candidate.href, await fetchHtml(candidate.href));
    } catch (error) {
      notes.push(`${candidate.href}: ${error instanceof Error ? error.message : "取得失敗"}`);
    }
  }

  return { pages, notes };
}
