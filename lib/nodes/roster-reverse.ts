import { extractRosterEntries } from "@/lib/crawl/roster";
import { fetchHtml } from "@/lib/crawl/fetcher";
import { isRobotsAllowed } from "@/lib/crawl/robots";
import { isSafePublicHttpUrl } from "@/lib/crawl/url-safety";
import { normalizeCompanyName, normalizeWebsite } from "@/lib/company/normalize";

export type DirectoryHit = {
  directoryName: string;
  nodeType: "vendor" | "association" | "financial";
  rosterUrl: string;
  partnerId: string;
  partnerName: string;
  evidenceText: string;
  matchedNodeId: string | null;
};

export type DirectorySourceLike = {
  name: string;
  nodeType: "vendor" | "association" | "financial";
  rosterUrl: string;
  crawlEnabled: boolean;
  accessPolicy: string;
};

export type PartnerLike = {
  id: string;
  name: string;
  url: string | null;
};

export type NodeLike = {
  id: string;
  name: string;
  rosterUrl: string | null;
};

function extractUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match?.[0] ?? null;
}

function cleanRosterName(name: string) {
  return name.replace(/https?:\/\/\S+/gi, "").replace(/[|／/].*$/, "").trim();
}

export function matchPartnerToRosterEntry(
  partner: PartnerLike,
  entry: { name: string; website: string | null; rawLine: string },
) {
  const partnerName = normalizeCompanyName(partner.name);
  const entryName = normalizeCompanyName(cleanRosterName(entry.name));
  const website = entry.website ?? extractUrl(entry.rawLine) ?? extractUrl(entry.name);
  if (partner.url && website && normalizeWebsite(partner.url) === normalizeWebsite(website)) {
    return "url" as const;
  }
  if (partnerName && entryName && partnerName === entryName) {
    return "name" as const;
  }
  return null;
}

export function findHitsInRosterHtml(input: {
  html: string;
  source: DirectorySourceLike;
  partners: PartnerLike[];
  nodes: NodeLike[];
}): DirectoryHit[] {
  const entries = extractRosterEntries(input.html, input.source.rosterUrl);
  const hits: DirectoryHit[] = [];
  const seen = new Set<string>();
  for (const partner of input.partners) {
    for (const entry of entries) {
      const match = matchPartnerToRosterEntry(partner, entry);
      if (!match) continue;
      const key = `${partner.id}:${input.source.rosterUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const matchedNode =
        input.nodes.find((node) => node.rosterUrl && normalizeWebsite(node.rosterUrl) === normalizeWebsite(input.source.rosterUrl)) ??
        input.nodes.find((node) => normalizeCompanyName(node.name) && normalizeCompanyName(node.name) === normalizeCompanyName(input.source.name)) ??
        null;
      hits.push({
        directoryName: input.source.name,
        nodeType: input.source.nodeType,
        rosterUrl: input.source.rosterUrl,
        partnerId: partner.id,
        partnerName: partner.name,
        evidenceText: entry.rawLine.slice(0, 180) || `${partner.name} が ${input.source.name} の名簿に掲載`,
        matchedNodeId: matchedNode?.id ?? null,
      });
    }
  }
  return hits;
}

export async function reverseLookupOfficialRosters(input: {
  sources: DirectorySourceLike[];
  partners: PartnerLike[];
  nodes: NodeLike[];
}): Promise<{ hits: DirectoryHit[]; notes: string[] }> {
  const notes: string[] = [];
  const hits: DirectoryHit[] = [];
  for (const source of input.sources) {
    if (!source.crawlEnabled || source.accessPolicy === "prohibited") continue;
    if (!isSafePublicHttpUrl(source.rosterUrl)) {
      notes.push(`${source.name}: 名簿 URL が安全ではありません`);
      continue;
    }
    if (!(await isRobotsAllowed(source.rosterUrl))) {
      notes.push(`${source.name}: robots.txt により取得不可`);
      continue;
    }
    try {
      const html = await fetchHtml(source.rosterUrl);
      hits.push(...findHitsInRosterHtml({ html, source, partners: input.partners, nodes: input.nodes }));
    } catch (error) {
      notes.push(`${source.name}: ${error instanceof Error ? error.message : "名簿取得失敗"}`);
    }
  }
  return { hits, notes };
}
