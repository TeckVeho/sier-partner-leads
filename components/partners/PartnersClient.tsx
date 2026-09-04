"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { deletePartner, savePartner } from "@/app/actions/partners";
import { startNodeDiscovery } from "@/app/actions/node-proposals";
import { PREFECTURE_REGIONS } from "@/lib/geo/prefectures";

type PartnerRow = {
  id: string;
  name: string;
  url: string | null;
  prefecture: string | null;
  targetPrefectures?: string[] | null;
  introContactLevel: string | null;
  relationshipNote: string | null;
  isActive: boolean;
  nodeMemberships: Array<{ node: { id: string; name: string } }>;
};

function targetAreas(row: Pick<PartnerRow, "prefecture" | "targetPrefectures">) {
  return row.targetPrefectures ?? (row.prefecture ? [row.prefecture] : []);
}

export function PartnersClient({ initialRows }: { initialRows: PartnerRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    url: "",
    prefecture: "",
    targetPrefectures: [] as string[],
    introContactLevel: "",
    relationshipNote: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataTableColumn<PartnerRow>[] = [
    { key: "name", header: "パートナー名" },
    { key: "prefecture", header: "所在地" },
    {
      key: "targetPrefectures",
      header: "対象エリア",
      render: (row) => {
        const areas = targetAreas(row);
        return areas.length > 0 ? areas.join("・") : "—";
      },
    },
    { key: "introContactLevel", header: "紹介窓口" },
    {
      key: "nodes",
      header: "所属ノード",
      render: (row) => row.nodeMemberships.map((m) => m.node.name).join("、") || "—",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(async () => {
                try {
                  await startNodeDiscovery(row.id);
                  setMessage(`${row.name} からノード提案を開始しました。名簿ノードで結果を確認できます。`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "開始に失敗しました");
                }
              });
            }}
          >
            ノードを探す
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              setForm({
                id: row.id,
                name: row.name,
                url: row.url ?? "",
                prefecture: row.prefecture ?? "",
                targetPrefectures: targetAreas(row),
                introContactLevel: row.introContactLevel ?? "",
                relationshipNote: row.relationshipNote ?? "",
              });
              setOpen(true);
            }}
          >
            編集
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(async () => {
                await deletePartner(row.id);
                setRows((prev) => prev.filter((p) => p.id !== row.id));
              });
            }}
          >
            削除
          </Button>
        </div>
      ),
    },
  ];

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const saved = await savePartner({
          id: form.id || undefined,
          name: form.name,
          url: form.url,
          prefecture: form.prefecture,
          targetPrefectures: form.targetPrefectures,
          introContactLevel: form.introContactLevel,
          relationshipNote: form.relationshipNote,
        });
        setRows((prev) => {
          const exists = prev.find((p) => p.id === saved.id);
          if (exists) {
            return prev.map((p) => (p.id === saved.id ? { ...p, ...saved, nodeMemberships: p.nodeMemberships } : p));
          }
          return [...prev, { ...saved, nodeMemberships: [] }];
        });
        setMessage("保存しました");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="既存パートナー"
        description="紹介を頼む先です。「ノードを探す」で Gemini が名簿候補を提案します。採用するまでノードは作りません。"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await startNodeDiscovery();
                    setMessage("有効パートナー全員からノード提案を開始しました。名簿ノードで結果を確認できます。");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "開始に失敗しました");
                  }
                });
              }}
            >
              全員からノードを探す
            </Button>
            <Button
              onClick={() => {
                setForm({ id: "", name: "", url: "", prefecture: "", targetPrefectures: [], introContactLevel: "", relationshipNote: "" });
                setOpen(true);
              }}
            >
              新規登録
            </Button>
          </div>
        }
      />

      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      {error ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />

      <Modal open={open} title={form.id ? "パートナー編集" : "パートナー登録"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Input placeholder="名称" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          <Input placeholder="所在地（都道府県）" value={form.prefecture} onChange={(e) => setForm((f) => ({ ...f, prefecture: e.target.value }))} />
          <div>
            <p className="mb-1.5 text-[12px] text-muted">対象エリア（名簿上の他県企業は優先度 C）</p>
            <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border px-2 py-2">
              {PREFECTURE_REGIONS.map((region) => (
                <div key={region.id}>
                  <p className="text-[11px] text-muted">{region.label}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {region.names.map((name) => (
                      <label key={name} className="flex items-center gap-1 text-[12px]">
                        <input
                          type="checkbox"
                          checked={form.targetPrefectures.includes(name)}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              targetPrefectures: f.targetPrefectures.includes(name)
                                ? f.targetPrefectures.filter((item) => item !== name)
                                : [...f.targetPrefectures, name],
                            }))
                          }
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Input placeholder="紹介窓口レベル" value={form.introContactLevel} onChange={(e) => setForm((f) => ({ ...f, introContactLevel: e.target.value }))} />
          <Input placeholder="関係メモ" value={form.relationshipNote} onChange={(e) => setForm((f) => ({ ...f, relationshipNote: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button loading={pending} onClick={handleSubmit}>保存</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
