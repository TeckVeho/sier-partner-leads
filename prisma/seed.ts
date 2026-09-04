import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccessPolicy,
  NodeType,
  PrismaClient,
  ScoringAxis,
} from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_NODES = [
  {
    name: "群馬県情報サービス産業協会（GUSSIA）会員一覧",
    nodeType: NodeType.association,
    rosterUrl: "https://www.gussia.or.jp/member/",
    accessPolicy: AccessPolicy.public,
    crawlEnabled: true,
    basePathScore: 50,
  },
  {
    name: "栃木県情報サービス産業協会（TISA）会員一覧",
    nodeType: NodeType.association,
    rosterUrl: "https://www.tisia.or.jp/companies/",
    accessPolicy: AccessPolicy.public,
    crawlEnabled: true,
    basePathScore: 50,
  },
  {
    name: "茨城県情報サービス産業協会（IBIS）会員一覧",
    nodeType: NodeType.association,
    rosterUrl: "https://www.ibis.or.jp/member",
    accessPolicy: AccessPolicy.public,
    crawlEnabled: true,
    basePathScore: 50,
  },
  {
    name: "OBC 奉行 販売店検索",
    nodeType: NodeType.vendor,
    rosterUrl: "https://www.obc.co.jp/partner/search",
    accessPolicy: AccessPolicy.public,
    crawlEnabled: false,
    basePathScore: 80,
    note: "検索UIのためクロール方式は Phase 2 で個別設計",
  },
];

const INITIAL_SCORING_RULES = [
  { ruleKey: "legacy_asset", axis: ScoringAxis.icp, weight: 20, isExclusion: false },
  { ruleKey: "stock_revenue", axis: ScoringAxis.icp, weight: 20, isExclusion: false },
  { ruleKey: "crisis_awareness", axis: ScoringAxis.icp, weight: 25, isExclusion: false },
  { ruleKey: "ai_inhouse", axis: ScoringAxis.icp, weight: 0, isExclusion: true },
  { ruleKey: "subsidiary", axis: ScoringAxis.icp, weight: 0, isExclusion: true },
  { ruleKey: "same_vendor_partner", axis: ScoringAxis.path, weight: 80, isExclusion: false },
  { ruleKey: "same_pref_association", axis: ScoringAxis.path, weight: 50, isExclusion: false },
  { ruleKey: "financial_matching", axis: ScoringAxis.path, weight: 20, isExclusion: false },
  { ruleKey: "multi_node_bonus", axis: ScoringAxis.path, weight: 10, isExclusion: false },
];

type CsvRow = {
  company_name: string;
  prefecture: string;
  city: string;
  website: string;
  verdict: string;
  exclusion_reason: string;
};

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split("\n");
  const header = lines[0]?.split(",") ?? [];
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key.trim()] = (values[i] ?? "").trim();
    });
    return row as CsvRow;
  });
}

function mapCompanyStatus(verdict: string) {
  if (verdict.includes("除外")) return "excluded" as const;
  if (verdict.includes("情報不足")) return "on_hold" as const;
  return "candidate" as const;
}

async function seedDemoData() {
  const partner = await prisma.partner.findFirst({ where: { name: "ダイセーSDC" } });
  const gunmaNode = await prisma.node.findFirst({
    where: { name: { contains: "群馬" } },
  });

  if (partner && gunmaNode) {
    await prisma.partnerNodeMembership.upsert({
      where: { partnerId_nodeId: { partnerId: partner.id, nodeId: gunmaNode.id } },
      update: {},
      create: { partnerId: partner.id, nodeId: gunmaNode.id, note: "seed" },
    });
  }

  const companies = await prisma.company.findMany();
  for (const company of companies) {
    if (company.status !== "candidate") continue;

    const existingSignal = await prisma.signal.findFirst({
      where: { companyId: company.id, signalType: "legacy_asset" },
    });
    if (!existingSignal) {
      await prisma.signal.create({
        data: {
          companyId: company.id,
          signalType: "legacy_asset",
          polarity: "positive",
          evidenceText: "seed: レガシー保守基盤の記述あり（デモ）",
          sourceUrl: company.url ?? "https://example.com",
          confidence: 0.6,
          modelVersion: "seed",
        },
      });
    }

    if (gunmaNode && company.prefecture === "群馬") {
      await prisma.nodeMembership.upsert({
        where: { nodeId_companyId: { nodeId: gunmaNode.id, companyId: company.id } },
        update: {},
        create: {
          nodeId: gunmaNode.id,
          companyId: company.id,
          sourceUrl: gunmaNode.rosterUrl,
        },
      });
    }

    const latestScore = await prisma.companyScore.findFirst({
      where: { companyId: company.id },
      orderBy: { calculatedAt: "desc" },
    });
    if (!latestScore) {
      const { scoreCompany } = await import("../lib/scoring/engine");
      await scoreCompany(company.id).catch(() => undefined);
    }
  }
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "管理者",
      role: "admin",
    },
  });

  await prisma.partner.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { targetPrefectures: ["群馬"], prefecture: "群馬" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "ダイセーSDC",
      url: "https://www.daisei-sdc.co.jp/",
      prefecture: "群馬",
      targetPrefectures: ["群馬"],
      introContactLevel: "役員",
      relationshipNote: "既存提携パートナー。群馬側の既存先。",
      isActive: true,
    },
  });

  for (const node of INITIAL_NODES) {
    const existing = await prisma.node.findFirst({ where: { name: node.name } });
    if (existing) {
      await prisma.node.update({ where: { id: existing.id }, data: node });
    } else {
      await prisma.node.create({ data: node });
    }
    if (node.rosterUrl) {
      await prisma.directorySource.upsert({
        where: { rosterUrl: node.rosterUrl },
        update: {
          name: node.name,
          nodeType: node.nodeType,
          crawlEnabled: node.crawlEnabled,
          accessPolicy: node.accessPolicy,
          officialDomain: new URL(node.rosterUrl).hostname,
        },
        create: {
          name: node.name,
          nodeType: node.nodeType,
          rosterUrl: node.rosterUrl,
          crawlEnabled: node.crawlEnabled,
          accessPolicy: node.accessPolicy,
          officialDomain: new URL(node.rosterUrl).hostname,
          prefectures: node.name.includes("群馬") ? ["群馬"] : node.name.includes("栃木") ? ["栃木"] : node.name.includes("茨城") ? ["茨城"] : [],
          note: "note" in node ? (node.note as string) : null,
        },
      });
    }
  }

  for (const rule of INITIAL_SCORING_RULES) {
    const existing = await prisma.scoringRule.findFirst({
      where: { ruleKey: rule.ruleKey, version: 1 },
    });
    if (!existing) {
      await prisma.scoringRule.create({ data: { ...rule, version: 1 } });
    }
  }

  const csvPath = join(process.cwd(), "data", "candidates.csv");
  const csv = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csv).filter((row) => row.company_name && row.company_name !== "SDC");

  for (const row of rows) {
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { name: row.company_name },
          ...(row.website ? [{ url: row.website }] : []),
        ],
      },
    });
    if (existing) continue;

    await prisma.company.create({
      data: {
        name: row.company_name,
        url: row.website || null,
        prefecture: row.prefecture || null,
        city: row.city || null,
        status: mapCompanyStatus(row.verdict),
        exclusionReason: row.verdict.includes("除外") ? row.verdict : null,
      },
    });
  }

  await seedDemoData();

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
