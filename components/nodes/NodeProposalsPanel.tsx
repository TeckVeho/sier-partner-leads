"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acceptNodeProposal, rejectNodeProposal, startNodeDiscovery } from "@/app/actions/node-proposals";
import { DISCOVERY_METHOD_LABELS, NODE_TYPE_LABELS } from "@/lib/scoring/labels";

export type NodeProposalRow = {
  id: string;
  name: string;
  nodeType: "vendor" | "association" | "financial";
  rosterUrl: string | null;
  evidenceText: string;
  confidence: number | null;
  discoveryMethod: "partner_site" | "official_roster" | null;
  sourceUrl: string | null;
  partner: { id: string; name: string; prefecture: string | null };
  matchedNode: { id: string; name: string } | null;
};

export function NodeProposalsPanel({
  initialRows,
  geminiConfigured,
}: {
  initialRows: NodeProposalRow[];
  geminiConfigured: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function discover() {
    setError(null);
    startTransition(async () => {
      try {
        await startNodeDiscovery();
        setMessage("ノード提案を開始しました。完了後にこの画面を開き直してください。");
      } catch (e) {
        setError(e instanceof Error ? e.message : "開始に失敗しました");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <section className="mb-5 rounded-xl border border-dashed border-border bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-text">Gemini からの提案</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              既存パートナーのサイトから名簿ノードを推定します。採用するまでノードは作りません。
            </p>
          </div>
          <Button variant="secondary" loading={pending} disabled={!geminiConfigured} onClick={discover}>
            全員から探す
          </Button>
        </div>
        {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
        {message ? <p className="mt-2 text-[12px] text-muted">{message}</p> : null}
        {!geminiConfigured ? (
          <p className="mt-2 text-[12px] text-danger">
            Gemini キーが未設定です。{" "}
            <Link href="/skills" className="underline">
              スキル管理
            </Link>
            から登録してください。
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-xl border border-border bg-white px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-text">確認待ちの提案 {rows.length} 件</h2>
          <p className="mt-0.5 text-[12px] text-muted">採用すると経由パートナー付きのノードになります。クロールはオフのままです。</p>
        </div>
        <Button variant="secondary" loading={pending} disabled={!geminiConfigured} onClick={discover}>
          追加で探す
        </Button>
      </div>
      {error ? <p className="mb-2 text-[12px] text-danger">{error}</p> : null}
      {message ? <p className="mb-2 text-[12px] text-muted">{message}</p> : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg border border-border px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text">{row.name}</p>
                <p className="mt-1 text-[12px] text-muted">
                  経由 {row.partner.name}
                  {row.partner.prefecture ? `（${row.partner.prefecture}）` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="muted">{NODE_TYPE_LABELS[row.nodeType]}</Badge>
                {row.discoveryMethod ? (
                  <Badge variant="muted">{DISCOVERY_METHOD_LABELS[row.discoveryMethod]}</Badge>
                ) : null}
                {row.matchedNode ? <Badge variant="warning">既存: {row.matchedNode.name}</Badge> : null}
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted">{row.evidenceText}</p>
            {row.rosterUrl ? (
              <p className="mt-1 truncate text-[12px]">
                <a href={row.rosterUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {row.rosterUrl}
                </a>
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-muted">名簿 URL なし（採用後に人手で追加）</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await acceptNodeProposal({ id: row.id });
                      setRows((prev) => prev.filter((item) => item.id !== row.id));
                      setMessage(row.matchedNode ? "既存ノードに経由パートナーを付けました" : "ノードを作成しました");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "採用に失敗しました");
                    }
                  })
                }
              >
                {row.matchedNode ? "所属だけ付ける" : "採用"}
              </Button>
              <Button
                variant="secondary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await rejectNodeProposal(row.id);
                      setRows((prev) => prev.filter((item) => item.id !== row.id));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "却下に失敗しました");
                    }
                  })
                }
              >
                却下
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
