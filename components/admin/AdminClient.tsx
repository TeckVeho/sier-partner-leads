"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { CRAWL_STATUS_LABELS, JOB_STATUS_LABELS, JOB_TYPE_LABELS } from "@/lib/scoring/labels";
import type { JobRunType } from "@prisma/client";

type JobRow = {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  progressNote: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
};

type CrawlRow = {
  id: string;
  status: string;
  sourceUrl: string;
  newCount: number;
  updatedCount: number;
  errorMessage: string | null;
  startedAt: string;
  node: { name: string } | null;
};

export function AdminClient({
  jobs,
  audits,
  crawlRuns,
}: {
  jobs: JobRow[];
  audits: AuditRow[];
  crawlRuns: CrawlRow[];
}) {
  const [jobRows, setJobRows] = useState(jobs);

  useEffect(() => {
    const timer = setInterval(async () => {
      const running = jobRows.some((j) => j.status === "running" || j.status === "pending");
      if (!running) return;
      const res = await fetch("/api/jobs/recent");
      if (!res.ok) return;
      const data = (await res.json()) as JobRow[];
      setJobRows(data);
    }, 3000);
    return () => clearInterval(timer);
  }, [jobRows]);

  const jobColumns: DataTableColumn<JobRow>[] = [
    {
      key: "jobType",
      header: "種別",
      render: (row) => JOB_TYPE_LABELS[row.jobType as JobRunType] ?? row.jobType,
    },
    {
      key: "status",
      header: "状態",
      render: (row) => (
        <Badge variant={row.status === "completed" ? "success" : row.status === "failed" ? "danger" : "warning"}>
          {JOB_STATUS_LABELS[row.status as keyof typeof JOB_STATUS_LABELS] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "progress",
      header: "進捗",
      render: (row) => `${row.progress}% ${row.progressNote ?? ""}`,
    },
    {
      key: "createdAt",
      header: "開始",
      render: (row) => new Date(row.createdAt).toLocaleString("ja-JP"),
    },
  ];

  const auditColumns: DataTableColumn<AuditRow>[] = [
    { key: "action", header: "操作" },
    { key: "entityType", header: "対象" },
    {
      key: "user",
      header: "ユーザー",
      render: (row) => row.user?.name ?? "system",
    },
    {
      key: "createdAt",
      header: "日時",
      render: (row) => new Date(row.createdAt).toLocaleString("ja-JP"),
    },
  ];

  const crawlColumns: DataTableColumn<CrawlRow>[] = [
    {
      key: "node",
      header: "ノード",
      render: (row) => row.node?.name ?? "—",
    },
    {
      key: "status",
      header: "結果",
      render: (row) => CRAWL_STATUS_LABELS[row.status as keyof typeof CRAWL_STATUS_LABELS] ?? row.status,
    },
    { key: "newCount", header: "新規" },
    { key: "updatedCount", header: "更新" },
    {
      key: "startedAt",
      header: "実行日時",
      render: (row) => new Date(row.startedAt).toLocaleString("ja-JP"),
    },
  ];

  return (
    <>
      <PageHeader
        title="システム管理"
        description="ジョブ・クロール・監査の履歴です。実行はダッシュボード右下から行います。"
      />

      <h2 className="mb-2 text-[14px] font-semibold">ジョブ実行履歴</h2>
      <DataTable columns={jobColumns} rows={jobRows} getRowKey={(row) => row.id} />

      <h2 className="mb-2 mt-6 text-[14px] font-semibold">クロール履歴</h2>
      <DataTable columns={crawlColumns} rows={crawlRuns} getRowKey={(row) => row.id} />

      <h2 className="mb-2 mt-6 text-[14px] font-semibold">監査ログ</h2>
      <DataTable columns={auditColumns} rows={audits} getRowKey={(row) => row.id} />
    </>
  );
}
