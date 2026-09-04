import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/app/actions/companies";
import { CompanyDetailClient } from "@/components/companies/CompanyDetailClient";
import { checkDatabaseConnection } from "@/lib/db-health";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return (
      <>
        <PageHeader title="候補詳細" description="データベース接続を確認してください。" />
        <p className="text-[13px] text-danger">{db.message}</p>
      </>
    );
  }

  try {
    const { company, paths } = await getCompanyDetail(id);
    return (
      <CompanyDetailClient
        company={{
          id: company.id,
          name: company.name,
          url: company.url,
          prefecture: company.prefecture,
          city: company.city,
          status: company.status,
          exclusionReason: company.exclusionReason,
          discoveredAt: company.discoveredAt.toISOString(),
          signals: company.signals.map((s) => ({
            id: s.id,
            signalType: s.signalType,
            polarity: s.polarity,
            evidenceText: s.evidenceText,
            sourceUrl: s.sourceUrl,
            modelVersion: s.modelVersion,
          })),
          scores: company.scores.map((s) => ({
            id: s.id,
            icpScore: s.icpScore,
            pathScore: s.pathScore,
            priority: s.priority,
            breakdown: s.breakdown,
            calculatedAt: s.calculatedAt.toISOString(),
          })),
          nodeMemberships: company.nodeMemberships.map((nm) => ({
            node: {
              id: nm.node.id,
              name: nm.node.name,
              basePathScore: nm.node.basePathScore,
            },
          })),
          introRequests: company.introRequests.map((r) => ({
            id: r.id,
            status: r.status,
            draftBody: r.draftBody,
            viaPartner: { name: r.viaPartner.name },
            viaNode: { name: r.viaNode.name },
          })),
          pipelineEvents: company.pipelineEvents.map((e) => ({
            id: e.id,
            stage: e.stage,
            lostReason: e.lostReason,
            note: e.note,
            occurredAt: e.occurredAt.toISOString(),
            recordedBy: e.recordedBy,
          })),
          contactLogs: company.contactLogs.map((log) => ({
            id: log.id,
            contactType: log.contactType,
            content: log.content,
            contactedAt: log.contactedAt.toISOString(),
            recordedBy: log.recordedBy,
          })),
          profile: company.profile
            ? {
                summary: company.profile.summary,
                businessModel: company.profile.businessModel,
                offerings: company.profile.offerings,
                customers: company.profile.customers,
                techAssets: company.profile.techAssets,
                changeSignals: company.profile.changeSignals,
                cautions: company.profile.cautions,
                establishedYear: company.profile.establishedYear,
                employeeScale: company.profile.employeeScale,
                evidenceText: company.profile.evidenceText,
                sourceUrl: company.profile.sourceUrl,
                modelVersion: company.profile.modelVersion,
                extractedAt: company.profile.extractedAt.toISOString(),
              }
            : null,
        }}
        paths={paths}
      />
    );
  } catch {
    notFound();
  }
}
