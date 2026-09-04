export function normalizeEvidence(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}

export function quoteAppearsInText(quote: string, text: string) {
  const needle = normalizeEvidence(quote);
  if (needle.length < 6) return false;
  return normalizeEvidence(text).includes(needle);
}

export type EvidencePage = {
  id: string;
  url: string;
  text: string;
};

export function findEvidencePage(pages: EvidencePage[], pageId: string | null, quote: string) {
  if (pageId) {
    const page = pages.find((item) => item.id === pageId);
    if (page && quoteAppearsInText(quote, page.text)) return page;
  }
  return pages.find((page) => quoteAppearsInText(quote, page.text)) ?? null;
}

export function formatPagesForPrompt(pages: EvidencePage[]) {
  if (pages.length === 0) return "（本文なし）";
  return pages
    .map((page) => `[${page.id}]\nURL: ${page.url}\nCONTENT:\n${page.text}`)
    .join("\n\n");
}
