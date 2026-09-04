export function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  return [...new Set(extractAnchors(html, baseUrl).map((anchor) => anchor.href))];
}

export function extractAnchors(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const results: Array<{ href: string; text: string }> = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const href = new URL(match[1], baseUrl).toString();
      const text = htmlToText(match[2] ?? "").slice(0, 80);
      results.push({ href, text });
    } catch {
      // ignore invalid URLs
    }
  }
  return results;
}
