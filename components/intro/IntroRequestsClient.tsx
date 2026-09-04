"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { approveIntroRequest, markIntroSent, updateIntroDraft } from "@/app/actions/intro-requests";
import { INTRO_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/scoring/labels";

type IntroRow = {
  id: string;
  status: string;
  draftBody: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    prefecture: string | null;
    city: string | null;
    scores: Array<{ priority: string }>;
  };
  viaPartner: { name: string };
  viaNode: { name: string };
};

export function IntroRequestsClient({ initialRows }: { initialRows: IntroRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<IntroRow | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataTableColumn<IntroRow>[] = [
    {
      key: "company",
      header: "候補企業",
      render: (row) => (
        <Link href={`/companies/${row.company.id}`} className="text-primary hover:underline">
          {row.company.name}
        </Link>
      ),
    },
    {
      key: "priority",
      header: "優先度",
      render: (row) => {
        const p = row.company.scores[0]?.priority;
        return p ? PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] : "—";
      },
    },
    {
      key: "path",
      header: "経路",
      render: (row) => `${row.viaPartner.name} / ${row.viaNode.name}`,
    },
    {
      key: "status",
      header: "状態",
      render: (row) => (
        <Badge variant={row.status === "draft" ? "warning" : "success"}>
          {INTRO_STATUS_LABELS[row.status as keyof typeof INTRO_STATUS_LABELS] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button
          variant="secondary"
          onClick={() => {
            setSelected(row);
            setDraft(row.draftBody);
          }}
        >
          確認
        </Button>
      ),
    },
  ];

  function saveDraft() {
    if (!selected) return;
    startTransition(async () => {
      await updateIntroDraft(selected.id, draft);
      setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, draftBody: draft } : r)));
      setMessage("下書きを保存しました");
    });
  }

  function approve() {
    if (!selected) return;
    startTransition(async () => {
      await approveIntroRequest(selected.id);
      setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: "approved" } : r)));
      setSelected((s) => (s ? { ...s, status: "approved" } : s));
      setMessage("承認しました（自動送信は行いません）");
    });
  }

  function markSent() {
    if (!selected) return;
    startTransition(async () => {
      await markIntroSent(selected.id);
      setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: "sent" } : r)));
      setSelected(null);
      setMessage("送信済みとして記録しました");
    });
  }

  return (
    <>
      <PageHeader title="依頼キュー" description="初稿は Gemini です。必ず人が直してから承認してください。自動送信はしません。" />
      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="依頼下書きがありません" />

      <Modal open={!!selected} title="依頼文案" onClose={() => setSelected(null)}>
        {selected?.draftBody.startsWith("【AI下書き") ? (
          <Alert variant="warning" className="mb-3">
            AI下書き（未送信）。文面は必ず確認し、必要なら直してください。
          </Alert>
        ) : (
          <Alert variant="info" className="mb-3">
            定型テンプレートの下書きです。送信はしません。
          </Alert>
        )}
        <textarea
          className="min-h-48 w-full rounded-md border border-border px-3 py-2 text-[13px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" loading={pending} onClick={saveDraft}>保存</Button>
          <Button loading={pending} onClick={approve}>承認</Button>
          <Button variant="secondary" loading={pending} onClick={markSent}>送信済みにする</Button>
        </div>
      </Modal>
    </>
  );
}
