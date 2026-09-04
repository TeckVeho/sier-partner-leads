import { normalizeCompanyName, normalizeWebsite } from "@/lib/company/normalize";

export function normalizeNodeName(name: string) {
  return normalizeCompanyName(name).replace(/(協会|協議会|組合|連盟)$/g, "");
}

export function findMatchingNode<T extends { id: string; name: string; rosterUrl: string | null }>(
  proposal: { name: string; rosterUrl: string | null },
  nodes: T[],
): T | null {
  const proposalName = normalizeNodeName(proposal.name);
  const proposalUrl = proposal.rosterUrl ? normalizeWebsite(proposal.rosterUrl) : "";
  for (const node of nodes) {
    if (proposalUrl && node.rosterUrl && normalizeWebsite(node.rosterUrl) === proposalUrl) {
      return node;
    }
    const nodeName = normalizeNodeName(node.name);
    if (proposalName && nodeName && (proposalName === nodeName || nodeName.includes(proposalName) || proposalName.includes(nodeName))) {
      return node;
    }
  }
  return null;
}

export function urlAppearsInText(url: string, text: string) {
  const raw = url.trim();
  if (!raw) return false;
  if (text.includes(raw)) return true;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return text.includes(parsed.hostname.replace(/^www\./, "")) && text.includes(parsed.pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}
