import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DistributionList } from "@/components/analytics/DistributionList";
import { Alert } from "@/components/ui/alert";
import { checkDatabaseConnection } from "@/lib/db-health";
import {
  OUTCOME_LABELS,
  PRIORITY_ORDER,
  getAnalyticsSummary,
  type OutcomeKey,
} from "@/lib/analytics/queries";
import { PIPELINE_LABELS, PIPELINE_ORDER, PRIORITY_LABELS, SIGNAL_TYPE_LABELS } from "@/lib/scoring/labels";
import { formatNumber } from "@/lib/utils";

export default async function AnalyticsPage() {
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return (
      <>
        <PageHeader title="分析" description="データベース接続を確認してください。" />
        <p className="text-[13px] text-danger">{db.message}</p>
      </>
    );
  }

  const summary = await getAnalyticsSummary();
  const outcomeKeys = Object.keys(OUTCOME_LABELS) as OutcomeKey[];

  return (
    <>
      <PageHeader
        title="分析"
        description="最新のステージと優先度で、転換・見送り・経路の当たりを確認します。数字は候補一覧にジャンプします。"
        actions={
          <Link href="/scoring-rules" className="text-[13px] text-primary hover:underline">
            スコア設定を見直す
          </Link>
        }
      />

      {summary.sampleNote ? (
        <Alert variant="warning" className="mb-4">
          提携 {summary.partnershipCount} 件 + 見送り {summary.lostCount} 件（合計 {summary.resultSample} 件）。
          20件未満なので転換率は参考値です。傾向判断には使わないでください。
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="候補企業"
          value={summary.totalCandidates}
          hint={`除外 ${summary.excludedCount} / 保留 ${summary.onHoldCount} は含みません`}
          href="/companies?status=candidate"
        />
        <StatCard label="平均 ICP" value={summary.avgIcp} hint="最新スコア。未採点は平均から除外" />
        <StatCard label="平均 経路" value={summary.avgPath} hint="最新スコア。未採点は平均から除外" />
        <StatCard
          label="提携 / 見送り"
          value={`${summary.partnershipCount} / ${summary.lostCount}`}
          hint={summary.unscoredCount > 0 ? `未採点 ${summary.unscoredCount} 社` : "最新ステージ"}
          href="/companies?stage=partnership"
        />
      </section>

      <section className="mt-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[14px] font-semibold">転換ファネル</h2>
        <p className="mt-1 text-[12px] text-muted">
          一度でもその段階に到達した会社数です。見送りはファネルから外し、下の分布で見ます。
        </p>
        <ol className="mt-4 grid gap-2 md:grid-cols-6">
          {summary.funnel.map((step, index) => (
            <li key={step.stage} className="rounded-md border border-border px-3 py-3">
              <Link href={`/companies?stage=${step.stage}`} className="block hover:text-primary">
                <p className="text-[12px] text-muted">{PIPELINE_LABELS[step.stage]}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(step.count)}</p>
                <p className="mt-1 text-[12px] text-muted">
                  全体比 {step.rateFromStart}%
                  {index > 0 ? ` · 前段比 ${step.rateFromPrev}%` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">優先度分布（最新）</h2>
          <DistributionList
            rows={PRIORITY_ORDER.map((priority) => ({
              key: priority,
              label: PRIORITY_LABELS[priority],
              count: summary.priorityCounts[priority],
              href: `/companies?priority=${priority}&status=candidate`,
            }))}
            empty="優先度が付いた候補がありません。一括再調査とスコア再計算を実行してください。"
          />
        </div>

        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">現在のパイプライン（最新ステージ）</h2>
          <DistributionList
            rows={PIPELINE_ORDER.map((stage) => ({
              key: stage,
              label: PIPELINE_LABELS[stage],
              count: summary.stageCounts[stage],
              href: `/companies?stage=${stage}`,
            }))}
            empty="パイプライン未着手です。"
          />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[14px] font-semibold">優先度 × 結果</h2>
        <p className="mt-1 text-[12px] text-muted">A なのに見送りが多い、C から提携が出る、などがスコア見直しの材料です。</p>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead className="border-b border-border bg-surface-subtle">
              <tr>
                <th className="px-3 py-2 text-[12px] font-medium text-muted">優先度</th>
                {outcomeKeys.map((key) => (
                  <th key={key} className="px-3 py-2 text-[12px] font-medium text-muted">
                    {OUTCOME_LABELS[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRIORITY_ORDER.map((priority) => (
                <tr key={priority} className="border-b border-border/80">
                  <td className="px-3 py-2.5 font-medium">
                    <Link href={`/companies?priority=${priority}`} className="text-primary hover:underline">
                      {PRIORITY_LABELS[priority]}
                    </Link>
                  </td>
                  {outcomeKeys.map((key) => (
                    <td key={key} className="px-3 py-2.5 tabular-nums">
                      {summary.outcomeByPriority[priority][key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[14px] font-semibold">見送り理由</h2>
        {summary.lostReasons.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">見送りはまだありません。理由はパイプライン移動時に必須です。</p>
        ) : (
          <DistributionList
            rows={summary.lostReasons.map((row) => ({
              key: row.reason,
              label: row.reason,
              count: row.count,
              href: `/companies?stage=lost&lostReason=${encodeURIComponent(row.reason)}`,
            }))}
          />
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">ノード別</h2>
          <p className="mt-1 text-[12px] text-muted">所属会社のうち、現在ステージが提携の割合です。</p>
          {summary.nodes.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">ノード所属がありません。</p>
          ) : (
            <ul className="mt-3 space-y-3 text-[13px]">
              {summary.nodes.map((node) => (
                <li key={node.nodeId}>
                  <Link href={`/companies?node=${encodeURIComponent(node.nodeName)}`} className="font-medium text-primary hover:underline">
                    {node.nodeName}
                  </Link>
                  <p className="mt-0.5 text-muted">
                    {node.companies} 社 · 提携 {node.partnership} · 商談 {node.meeting} · 見送り {node.lost} · 転換 {node.conversionPercent}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">シグナル別</h2>
          <p className="mt-1 text-[12px] text-muted">そのシグナルがある会社のうち、現在提携の割合です。配点見直しの材料にします。</p>
          {summary.signals.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">シグナルがありません。再調査を実行してください。</p>
          ) : (
            <ul className="mt-3 space-y-3 text-[13px]">
              {summary.signals.map((row) => (
                <li key={row.signalType}>
                  <p className="font-medium">
                    {SIGNAL_TYPE_LABELS[row.signalType as keyof typeof SIGNAL_TYPE_LABELS] ?? row.signalType}
                  </p>
                  <p className="mt-0.5 text-muted">
                    {row.companies} 社 · 提携 {row.partnership} · 商談 {row.meeting} · 見送り {row.lost} · 転換 {row.conversionPercent}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="mt-6 text-[12px] text-muted">
        ファネルの到達数と、現在のパイプライン分布は定義が違います。前者は「一度でも到達」、後者は「今いる列」です。
        数字をクリックすると候補一覧が絞り込みます。
      </p>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-text">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-lg border border-border bg-white px-4 py-3 hover:bg-primary-light">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-lg border border-border bg-white px-4 py-3">{inner}</div>;
}
