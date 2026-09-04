import { listNodes, listPartnerOptions } from "@/app/actions/nodes";
import { listNodeProposals } from "@/app/actions/node-proposals";
import { NodesClient } from "@/components/nodes/NodesClient";
import { NodeProposalsPanel } from "@/components/nodes/NodeProposalsPanel";
import { isLlmConfigured } from "@/lib/llm/config";

export default async function NodesPage() {
  const [rows, partners, proposals] = await Promise.all([
    listNodes(),
    listPartnerOptions(),
    listNodeProposals("pending"),
  ]);
  return (
    <>
      <NodeProposalsPanel
        geminiConfigured={await isLlmConfigured()}
        initialRows={proposals.map((row) => ({
          id: row.id,
          name: row.name,
          nodeType: row.nodeType,
          rosterUrl: row.rosterUrl,
          evidenceText: row.evidenceText,
          confidence: row.confidence == null ? null : Number(row.confidence),
          discoveryMethod: row.discoveryMethod,
          sourceUrl: row.sourceUrl,
          partner: row.partner,
          matchedNode: row.matchedNode,
        }))}
      />
      <NodesClient initialRows={rows} partners={partners} />
    </>
  );
}
