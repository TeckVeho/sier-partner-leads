import { prisma } from "@/lib/db";

export type IntroPath = {
  partnerId: string;
  partnerName: string;
  introContactLevel: string | null;
  nodeId: string;
  nodeName: string;
  pathScore: number;
};

export async function findIntroPaths(companyId: string): Promise<IntroPath[]> {
  const memberships = await prisma.nodeMembership.findMany({
    where: { companyId },
    select: { nodeId: true, node: { select: { id: true, name: true, basePathScore: true } } },
  });
  const nodeIds = memberships.map((m) => m.nodeId);
  if (nodeIds.length === 0) return [];

  const partnerLinks = await prisma.partnerNodeMembership.findMany({
    where: { nodeId: { in: nodeIds }, partner: { isActive: true } },
    include: {
      partner: { select: { id: true, name: true, introContactLevel: true } },
      node: { select: { id: true, name: true, basePathScore: true } },
    },
  });

  return partnerLinks
    .map((link) => ({
      partnerId: link.partner.id,
      partnerName: link.partner.name,
      introContactLevel: link.partner.introContactLevel,
      nodeId: link.node.id,
      nodeName: link.node.name,
      pathScore: link.node.basePathScore,
    }))
    .sort((a, b) => b.pathScore - a.pathScore);
}
