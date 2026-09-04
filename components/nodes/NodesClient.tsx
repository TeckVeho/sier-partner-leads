"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { saveNode } from "@/app/actions/nodes";

type PartnerOption = {
  id: string;
  name: string;
  prefecture: string | null;
};

type NodeRow = {
  id: string;
  name: string;
  nodeType: string;
  rosterUrl: string | null;
  accessPolicy: string;
  crawlEnabled: boolean;
  basePathScore: number;
  lastCrawledAt: string | null;
  note: string | null;
  partners: Array<{ id: string; name: string }>;
  _count: { companyMemberships: number; crawlRuns: number };
};

const emptyForm = {
  id: "",
  name: "",
  nodeType: "association",
  rosterUrl: "",
  accessPolicy: "public",
  crawlEnabled: true,
  basePathScore: 50,
  note: "",
  partnerIds: [] as string[],
};

export function NodesClient({
  initialRows,
  partners,
}: {
  initialRows: NodeRow[];
  partners: PartnerOption[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const columns: DataTableColumn<NodeRow>[] = [
    { key: "name", header: "ノード名" },
    { key: "nodeType", header: "種別" },
    {
      key: "partners",
      header: "経由パートナー",
      render: (row) =>
        row.partners.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.partners.map((partner) => (
              <Badge key={partner.id} variant="muted">
                {partner.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted">未設定</span>
        ),
    },
    {
      key: "policy",
      header: "アクセス",
      render: (row) => (
        <Badge variant={row.accessPolicy === "public" ? "success" : "warning"}>{row.accessPolicy}</Badge>
      ),
    },
    {
      key: "crawl",
      header: "クロール",
      render: (row) => (row.crawlEnabled ? "有効" : "無効"),
    },
    { key: "basePathScore", header: "経路基礎点" },
    {
      key: "members",
      header: "所属企業",
      render: (row) => row._count.companyMemberships,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setForm({
              id: row.id,
              name: row.name,
              nodeType: row.nodeType,
              rosterUrl: row.rosterUrl ?? "",
              accessPolicy: row.accessPolicy,
              crawlEnabled: row.crawlEnabled,
              basePathScore: row.basePathScore,
              note: row.note ?? "",
              partnerIds: row.partners.map((partner) => partner.id),
            });
            setOpen(true);
          }}
        >
          編集
        </Button>
      ),
    },
  ];

  function submit() {
    startTransition(async () => {
      const saved = await saveNode({
        id: form.id || undefined,
        name: form.name,
        nodeType: form.nodeType as "vendor" | "association" | "financial",
        rosterUrl: form.rosterUrl,
        accessPolicy: form.accessPolicy as "public" | "members_only" | "prohibited",
        crawlEnabled: form.crawlEnabled,
        basePathScore: Number(form.basePathScore),
        note: form.note,
        partnerIds: form.partnerIds,
      });
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) return prev.map((r, i) => (i === idx ? saved : r));
        return [...prev, saved];
      });
      setMessage("保存しました");
      setOpen(false);
    });
  }

  return (
    <>
      <PageHeader
        title="名簿ノード"
        description="紹介経路となる名簿ノードです。どの既存パートナー経由で見つけたかを付けておきます。"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            新規登録
          </Button>
        }
      />
      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />

      <Modal open={open} title={form.id ? "ノード編集" : "ノード登録"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="名称" />
          <Select value={form.nodeType} onChange={(e) => setForm((f) => ({ ...f, nodeType: e.target.value }))}>
            <option value="association">association</option>
            <option value="vendor">vendor</option>
            <option value="financial">financial</option>
          </Select>
          <Input value={form.rosterUrl} onChange={(e) => setForm((f) => ({ ...f, rosterUrl: e.target.value }))} placeholder="名簿URL" />
          <Select value={form.accessPolicy} onChange={(e) => setForm((f) => ({ ...f, accessPolicy: e.target.value }))}>
            <option value="public">public</option>
            <option value="members_only">members_only</option>
            <option value="prohibited">prohibited</option>
          </Select>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.crawlEnabled} onChange={(e) => setForm((f) => ({ ...f, crawlEnabled: e.target.checked }))} />
            クロール有効
          </label>
          <Input type="number" value={form.basePathScore} onChange={(e) => setForm((f) => ({ ...f, basePathScore: Number(e.target.value) }))} placeholder="経路基礎点" />
          <div>
            <p className="mb-1.5 text-[12px] text-muted">経由パートナー（この名簿を知った既存先）</p>
            {partners.length === 0 ? (
              <p className="text-[12px] text-muted">先に既存パートナーを登録してください。</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border px-2 py-2">
                {partners.map((partner) => (
                  <label key={partner.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.partnerIds.includes(partner.id)}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          partnerIds: f.partnerIds.includes(partner.id)
                            ? f.partnerIds.filter((id) => id !== partner.id)
                            : [...f.partnerIds, partner.id],
                        }))
                      }
                    />
                    <span>
                      {partner.name}
                      {partner.prefecture ? <span className="text-muted">（{partner.prefecture}）</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="メモ" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button loading={pending} onClick={submit}>保存</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
