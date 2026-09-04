import { prisma } from "@/lib/db";
import { checkDatabaseConnection } from "@/lib/db-health";
import { getExecutionMonitor } from "@/app/actions/jobs";
import { ExecutionMonitor } from "@/components/dashboard/ExecutionMonitor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

async function getDashboardStats() {
  const [
    candidateCount,
    draftRequests,
    priorityA,
    pipelineCounts,
  ] = await Promise.all([
    prisma.company.count({ where: { status: "candidate" } }),
    prisma.introRequest.count({ where: { status: "draft" } }),
    prisma.companyScore.count({
      where: {
        priority: "A",
        company: { status: "candidate" },
      },
    }),
    prisma.pipelineEvent.groupBy({
      by: ["stage"],
      _count: { stage: true },
    }),
  ]);

  return {
    candidateCount,
    draftRequests,
    priorityA,
    pipelineCounts: Object.fromEntries(
      pipelineCounts.map((row) => [row.stage, row._count.stage]),
    ) as Record<string, number>,
  };
}

function DbSetupNotice({ message }: { message: string }) {
  return (
    <>
      <PageHeader title="ダッシュボード" description="データベースの接続を確認してください。" />
      <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-4 text-[13px]">
        <p className="font-medium text-danger">{message}</p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-white px-3 py-2 text-[12px] text-muted">
          docker-compose up -d{"\n"}
          npm run db:migrate{"\n"}
          npm run db:seed{"\n"}
          npm run dev
        </pre>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: number;
  hint?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {badge}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-text">{formatNumber(value)}</p>
      {hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return <DbSetupNotice message={db.message} />;
  }

  const [stats, monitor] = await Promise.all([getDashboardStats(), getExecutionMonitor()]);

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="滞留案件と、台帳づくりの実行状況です。"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="承認待ちの依頼"
          value={stats.draftRequests}
          hint="依頼キューで文案を確認"
          badge={stats.draftRequests > 0 ? <Badge variant="warning">要確認</Badge> : null}
        />
        <StatCard
          label="優先度 A（未着手候補）"
          value={stats.priorityA}
          hint="スコア算出後に表示されます"
        />
        <StatCard label="候補企業（台帳）" value={stats.candidateCount} />
        <StatCard
          label="パイプラインイベント"
          value={Object.values(stats.pipelineCounts).reduce((a, b) => a + b, 0)}
          hint="パイプライン画面で管理"
        />
      </section>

      <ExecutionMonitor initial={monitor} />
    </>
  );
}
