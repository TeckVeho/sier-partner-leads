"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { COMPANY_STATUS_LABELS, PIPELINE_LABELS, PIPELINE_ORDER, PRIORITY_LABELS } from "@/lib/scoring/labels";
import { formatDate } from "@/lib/utils";
import type { CompanyListFilters } from "@/app/actions/companies";

export type CompanyRow = {
  id: string;
  name: string;
  url: string | null;
  prefecture: string | null;
  city: string | null;
  status: string;
  exclusionReason: string | null;
  priority: string | null;
  icpScore: number | null;
  pathScore: number | null;
  nodes: string[];
  latestStage: string;
  lostReason: string | null;
  discoveredAt: string;
  outOfCoverage?: boolean;
};

export function CompaniesClient({
  initialRows,
  targetPrefectures,
  initialFilters = {},
}: {
  initialRows: CompanyRow[];
  targetPrefectures: string[];
  initialFilters?: CompanyListFilters;
}) {
  const router = useRouter();
  const [rows] = useState(initialRows);
  const [filters, setFilters] = useState<CompanyListFilters>(initialFilters);

  const prefectureOptions = useMemo(() => {
    const fromRows = rows.map((row) => row.prefecture).filter((pref): pref is string => Boolean(pref));
    return [...new Set([...targetPrefectures, ...fromRows])];
  }, [rows, targetPrefectures]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filters.status && row.status !== filters.status) return false;
      if (filters.priority && row.priority !== filters.priority) return false;
      if (filters.prefecture && row.prefecture !== filters.prefecture) return false;
      if (filters.stage && row.latestStage !== filters.stage) return false;
      if (filters.node && !row.nodes.includes(filters.node)) return false;
      if (filters.lostReason && (row.lostReason ?? "理由未記入") !== filters.lostReason) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!row.name.toLowerCase().includes(q) && !(row.city ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, filters]);

  const columns: DataTableColumn<CompanyRow>[] = [
    {
      key: "name",
      header: "企業名",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.url ? (
            <a href={row.url} target="_blank" rel="noreferrer" className="text-[12px] text-primary hover:underline">
              {row.url}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: "location",
      header: "所在地",
      render: (row) => [row.prefecture, row.city].filter(Boolean).join(" ") || "—",
    },
    {
      key: "discoveredAt",
      header: "取得日",
      render: (row) => formatDate(row.discoveredAt),
    },
    {
      key: "priority",
      header: "優先度",
      render: (row) =>
        <div className="flex flex-wrap items-center gap-1">
          {row.priority ? (
            <Badge variant={row.priority === "A" ? "success" : row.priority === "B" ? "warning" : "muted"}>
              {PRIORITY_LABELS[row.priority as keyof typeof PRIORITY_LABELS] ?? row.priority}
            </Badge>
          ) : (
            "—"
          )}
          {row.outOfCoverage ? <Badge variant="warning">エリア外</Badge> : null}
        </div>
    },
    {
      key: "scores",
      header: "ICP / 経路",
      render: (row) =>
        row.icpScore != null ? `${row.icpScore} / ${row.pathScore ?? 0}` : "未採点",
    },
    {
      key: "nodes",
      header: "所属ノード",
      render: (row) => row.nodes.join("、") || "—",
    },
    {
      key: "status",
      header: "状態",
      render: (row) => (
        <Badge variant={row.status === "candidate" ? "muted" : row.status === "excluded" ? "danger" : "warning"}>
          {COMPANY_STATUS_LABELS[row.status as keyof typeof COMPANY_STATUS_LABELS] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="候補一覧"
        description="ICP × 経路強度の2軸で候補企業を確認します。パートナー対象エリア外は優先度 C です。"
      />

      <div className="mb-4 grid gap-2 md:grid-cols-5">
        <Input
          placeholder="企業名・市区町村で検索"
          value={filters.q ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <Select
          value={filters.prefecture ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, prefecture: e.target.value || undefined }))}
        >
          <option value="">すべての県</option>
          {prefectureOptions.map((pref) => (
            <option key={pref} value={pref}>
              {pref}
            </option>
          ))}
        </Select>
        <Select
          value={filters.priority ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, priority: (e.target.value || undefined) as CompanyListFilters["priority"] }))}
        >
          <option value="">全優先度</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="hold">保留</option>
        </Select>
        <Select
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as CompanyListFilters["status"] }))}
        >
          <option value="">全ステータス</option>
          <option value="candidate">候補</option>
          <option value="on_hold">保留</option>
          <option value="excluded">除外</option>
        </Select>
        <Select
          value={filters.stage ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value || undefined }))}
        >
          <option value="">全ステージ</option>
          {PIPELINE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {PIPELINE_LABELS[stage]}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
        emptyMessage="候補がありません。ダッシュボード右下の実行から名簿クロールしてください。"
      />

      <p className="mt-3 text-[12px] text-muted">
        {filtered.length} 件表示 / 全 {rows.length} 件
        {" · "}
        <Link href="/admin" className="text-primary hover:underline">
          名簿クロール
        </Link>
      </p>
    </>
  );
}
