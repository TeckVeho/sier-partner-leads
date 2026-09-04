import { prisma } from "@/lib/db";
import { ALL_PREFECTURES } from "@/lib/geo/prefectures";

/** 有効パートナーの対象エリアの和。未設定なら所在地を使う。 */
export async function getCoveragePrefectures(): Promise<string[]> {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      select: { prefecture: true, targetPrefectures: true },
    });
    const names = new Set<string>();
    for (const partner of partners) {
      const fromTarget = (partner.targetPrefectures ?? []).filter((name) => ALL_PREFECTURES.includes(name));
      if (fromTarget.length > 0) {
        for (const name of fromTarget) names.add(name);
        continue;
      }
      if (partner.prefecture && ALL_PREFECTURES.includes(partner.prefecture)) {
        names.add(partner.prefecture);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

/** @deprecated 互換。正はパートナー対象エリアの和 */
export async function getTargetPrefectures(): Promise<string[]> {
  return getCoveragePrefectures();
}

export function isOutOfCoverage(prefecture: string | null | undefined, coverage: string[]): boolean {
  if (!prefecture || coverage.length === 0) return false;
  return !coverage.includes(prefecture);
}
