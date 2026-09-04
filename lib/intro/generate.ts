import { prisma } from "@/lib/db";
import { runIntroDraft } from "@/lib/llm/run-intro-draft";

export async function createIntroRequest(input: {
  companyId: string;
  viaPartnerId: string;
  viaNodeId: string;
}) {
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
  });
  if (!company) throw new Error("Company not found");

  const partner = await prisma.partner.findUnique({ where: { id: input.viaPartnerId } });
  const node = await prisma.node.findUnique({ where: { id: input.viaNodeId } });
  if (!partner || !node) throw new Error("Path not found");

  const latest = company.scores[0];
  const generated = await runIntroDraft({
    companyName: company.name,
    partnerName: partner.name,
    partnerNote: partner.relationshipNote,
    nodeName: node.name,
    prefecture: company.prefecture,
    city: company.city,
    priority: latest?.priority ?? null,
    icpScore: latest?.icpScore ?? null,
    pathScore: latest?.pathScore ?? null,
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
