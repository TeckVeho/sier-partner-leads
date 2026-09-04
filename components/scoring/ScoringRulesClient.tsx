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
import { saveScoringRule } from "@/app/actions/scoring";
import {
  getRuleDescription,
  getRuleLabel,
  PRIORITY_MATRIX,
  SCORING_RULE_CATALOG,
} from "@/lib/scoring/rule-catalog";

type RuleRow = {
  id: string;
  ruleKey: string;
  axis: string;
  weight: number;
  isExclusion: boolean;
  version: number;
};

const EMPTY_FORM = {
  id: "",
  ruleKey: "",
  axis: "icp" as "icp" | "path",
  weight: 10,
  isExclusion: false,
};

export function ScoringRulesClient({ initialRows, version }: { initialRows: RuleRow[]; version: number }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(form.id);

  const icpRules = rows.filter((r) => r.axis === "icp");
  const pathRules = rows.filter((r) => r.axis === "path");

  const columns: DataTableColumn<RuleRow>[] = [
    {
      key: "ruleKey",
      header: "ルール",
      render: (row) => (
        <div>
          <p className="font-medium">{getRuleLabel(row.ruleKey)}</p>
          <p className="text-[12px] text-muted">{getRuleDescription(row.ruleKey)}</p>
        </div>
      ),
    },
    {
      key: "axis",
      header: "軸",
      render: (row) => (row.axis === "icp" ? "ICP適合度" : "経路強度"),
    },
    {
      key: "weight",
      header: "重み",
      render: (row) => (row.isExclusion ? "除外" : `+${row.weight} 点`),
    },
    {
      key: "isExclusion",
      header: "種別",
      render: (row) =>
        row.isExclusion ? (
          <Badge variant="danger">除外条件</Badge>
        ) : (
          <Badge variant="success">加点</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(row); }}>
          編集
        </Button>
      ),
    },
  ];

  function startEdit(row: RuleRow) {
    setForm({
      id: row.id,
      ruleKey: row.ruleKey,
      axis: row.axis === "path" ? "path" : "icp",
      weight: row.weight,
      isExclusion: row.isExclusion,
    });
    setError(null);
    setOpen(true);
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function submit() {
    if (!form.ruleKey.trim()) {
      setError("ルールキーを入力してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const saved = await saveScoringRule({
          id: form.id || undefined,
          ruleKey: form.ruleKey.trim(),
          axis: form.axis,
          weight: Number(form.weight),
          isExclusion: form.isExclusion,
        });
        setRows((prev) => {
          const exists = prev.some((row) => row.id === saved.id);
          if (exists) return prev.map((row) => (row.id === saved.id ? saved : row));
          return [...prev, saved];
        });
        setMessage(editing ? "ルールを更新しました。反映するにはシステム管理でスコア再計算を実行してください。" : "ルールを追加しました。");
        setOpen(false);
        setForm(EMPTY_FORM);
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="スコア設定"
        description={`各候補を ICP適合度 × 経路強度 の2軸で採点し、優先度 A/B/C/保留 を決めます（version ${version}）。`}
      />
      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      {error && !open ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">ICP適合度（この会社は協業相手として合うか）</h2>
          <p className="mt-1 text-[12px] text-muted">
            サイトから抽出したシグナルに、下記ルールの重みを加算します。レガシー保守基盤は必須条件です。
          </p>
          <ul className="mt-3 space-y-2 text-[13px]">
            {icpRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <span>{getRuleLabel(rule.ruleKey)}</span>
                <span className="flex items-center gap-2">
                  <span>{rule.isExclusion ? "除外" : `+${rule.weight}`}</span>
                  <Button variant="ghost" onClick={() => startEdit(rule)}>編集</Button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[14px] font-semibold">経路強度（紹介できるルートがあるか）</h2>
          <p className="mt-1 text-[12px] text-muted">
            所属ノードの経路基礎点に加え、共通ノード経由の紹介可能性を評価します。
          </p>
          <ul className="mt-3 space-y-2 text-[13px]">
            {pathRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <span>{getRuleLabel(rule.ruleKey)}</span>
                <span className="flex items-center gap-2">
                  <span>+{rule.weight}</span>
                  <Button variant="ghost" onClick={() => startEdit(rule)}>編集</Button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">※ 複数ノード所属時は追加で +10 点/ノード</p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[14px] font-semibold">優先度マトリクス</h2>
        <table className="mt-3 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[12px] text-muted">
              <th className="py-2">ICP</th>
              <th className="py-2">経路</th>
              <th className="py-2">優先度</th>
            </tr>
          </thead>
          <tbody>
            {PRIORITY_MATRIX.map((row) => (
              <tr key={`${row.icp}-${row.path}`} className="border-b border-border/60">
                <td className="py-2">{row.icp}</td>
                <td className="py-2">{row.path}</td>
                <td className="py-2 font-medium">{row.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">ルール一覧</h2>
        <Button variant="secondary" onClick={startCreate}>
          ルールを追加
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />

      <Modal open={open} title={editing ? "ルール編集" : "ルール追加"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <div>
            <p className="mb-1 text-[12px] text-muted">ルール</p>
            <Input
              list="rule-keys"
              value={form.ruleKey}
              onChange={(e) => setForm((f) => ({ ...f, ruleKey: e.target.value }))}
              placeholder="rule_key"
              disabled={editing}
            />
            <datalist id="rule-keys">
              {Object.keys(SCORING_RULE_CATALOG).map((key) => (
                <option key={key} value={key}>
                  {getRuleLabel(key)}
                </option>
              ))}
            </datalist>
            {form.ruleKey ? (
              <p className="mt-1 text-[12px] text-muted">{getRuleDescription(form.ruleKey)}</p>
            ) : null}
          </div>
          <div>
            <p className="mb-1 text-[12px] text-muted">軸</p>
            <Select
              value={form.axis}
              onChange={(e) => setForm((f) => ({ ...f, axis: e.target.value as "icp" | "path" }))}
            >
              <option value="icp">ICP適合度</option>
              <option value="path">経路強度</option>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-[12px] text-muted">重み（加点）</p>
            <Input
              type="number"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))}
              disabled={form.isExclusion}
            />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.isExclusion}
              onChange={(e) => setForm((f) => ({ ...f, isExclusion: e.target.checked }))}
            />
            除外条件（該当したら候補から外す）
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button loading={pending} onClick={submit}>
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
