import { prisma } from "@/lib/db";
import { runIntroDraft } from "@/lib/llm/run-intro-draft";
import { NODE_TYPE_LABELS } from "@/lib/scoring/labels";

export async function createIntroRequest(input: {
  companyId: string;
  viaPartnerId: string;
  viaNodeId: string;
}) {
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { profile: true },
  });
  if (!company) throw new Error("Company not found");

  const partner = await prisma.partner.findUnique({ where: { id: input.viaPartnerId } });
  const node = await prisma.node.findUnique({ where: { id: input.viaNodeId } });
  if (!partner || !node) throw new Error("Path not found");

  const generated = await runIntroDraft({
    companyName: company.name,
    partnerName: partner.name,
    nodeName: node.name,
    nodeTypeLabel: NODE_TYPE_LABELS[node.nodeType],
    prefecture: company.prefecture,
    city: company.city,
    summary: company.profile?.summary ?? null,
    offerings: company.profile?.offerings ?? [],
    customers: company.profile?.customers ?? null,
  });

  return prisma.introRequest.create({
    data: {
      companyId: input.companyId,
      viaPartnerId: input.viaPartnerId,
      viaNodeId: input.viaNodeId,
      draftBody: generated.draftBody,
      status: "draft",
    },
  });
}
