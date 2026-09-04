"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Mail, Play, RefreshCw, Scale, Search, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { startJob, type ExecutionMonitorSnapshot } from "@/app/actions/jobs";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS } from "@/lib/scoring/labels";
import { cn, formatDateTime } from "@/lib/utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function num(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function formatElapsed(startedAt: string | null, now: number) {
  if (!startedAt) return "0:00";
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const STEP_ICONS = {
  roster_crawl: Search,
  signal_extract: RefreshCw,
  score_recalc: Scale,
  intro_draft: Mail,
} as const;

function LedgerReport({ report }: { report: Record<string, unknown> }) {
  const crawl = asRecord(report.crawl);
  const extract = asRecord(report.extract);
  const score = asRecord(report.score);
  const intro = asRecord(report.intro);
  const notes = [
    ...(Array.isArray(crawl?.failedNotes) ? (crawl.failedNotes as string[]) : []),
    ...(Array.isArray(extract?.failedNotes) ? (extract.failedNotes as string[]) : []),
    ...(Array.isArray(extract?.insufficientNotes) ? (extract.insufficientNotes as string[]) : []),
    ...(Array.isArray(intro?.failedNotes) ? (intro.failedNotes as string[]) : []),
  ].slice(0, 8);

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-subtle px-4 py-3">
      <p className="text-[13px] font-semibold text-text">結果レポート</p>
      <dl className="mt-2 grid gap-2 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-[11px] text-muted">名簿クロール</dt>
          <dd>
            新規 {num(crawl?.newCount)} / 更新 {num(crawl?.updatedCount)} / 失敗 {num(crawl?.failedCount)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">再調査</dt>
          <dd>
            AI {num(extract?.llmCount)} / 根拠不足 {num(extract?.insufficientCount)} / 失敗 {num(extract?.failedCount)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">スコア再計算</dt>
          <dd>{num(score?.count)} 社</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">エリア外</dt>
          <dd>{num(report.outOfCoverageCount)} 社</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">依頼下書き</dt>
          <dd>
            {num(intro?.eligible) === 0
              ? "対象なし"
              : `下書き ${num(intro?.drafted)} 件 / 経路なしスキップ ${num(intro?.skippedNoPath)} 件`}
          </dd>
        </div>
      </dl>
      {notes.length > 0 ? (
        <ul className="mt-3 space-y-1 text-[12px] text-muted">
          {notes.map((note) => (
            <li key={note}>・{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ExecutionMonitor({ initial }: { initial: ExecutionMonitorSnapshot }) {
  const { user } = useAuth();
  const canRun = user.role === "admin";
  const [data, setData] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [runningExtra, setRunningExtra] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const feedJobId = useRef<string | null>(null);

  const live = Boolean(data.active);
  const focus = data.active ?? data.latest;

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(async () => {
      const res = await fetch("/api/jobs/monitor");
      if (!res.ok) return;
      setData((await res.json()) as ExecutionMonitorSnapshot);
    }, 1500);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    const job = data.active;
    if (!job) return;
    if (feedJobId.current !== job.id) {
      feedJobId.current = job.id;
      setFeed(job.progressNote ? [job.progressNote] : []);
      return;
    }
    const note = job.progressNote;
    if (note) {
      setFeed((prev) => (prev[0] === note ? prev : [note, ...prev].slice(0, 5)));
    }
  }, [data.active]);

  function start(type: "ledger_update" | "node_discovery") {
    setRunError(null);
    if (type === "node_discovery") setRunningExtra(true);
    startTransition(async () => {
      try {
        await startJob(type);
        const res = await fetch("/api/jobs/monitor");
        if (res.ok) setData((await res.json()) as ExecutionMonitorSnapshot);
        setMenuOpen(false);
      } catch (error) {
        setRunError(error instanceof Error ? error.message : "開始に失敗しました");
      } finally {
        setRunningExtra(false);
      }
    });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 bg-surface-subtle/70 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-text">実行モニタ</h2>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                <span className="monitor-live-dot h-1.5 w-1.5 rounded-full bg-warning" />
                LIVE
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-muted">台帳更新はクロール → 再調査 → 採点 → 依頼下書きまで一気に回します。</p>
        </div>
        {live && data.active ? (
          <p className="text-[12px] tabular-nums text-muted" suppressHydrationWarning>
            経過 {formatElapsed(data.active.startedAt ?? data.active.createdAt, now)}
          </p>
        ) : focus ? (
          <Badge variant={focus.status === "failed" ? "danger" : focus.status === "completed" ? "success" : "muted"}>
            {JOB_STATUS_LABELS[focus.status as keyof typeof JOB_STATUS_LABELS] ?? focus.status}
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-5">
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {data.steps.map((step, index) => {
            const Icon = STEP_ICONS[step.key];
            const current = step.status === "running";
            const done = step.status === "completed";
            const failed = step.status === "failed";
            return (
              <li key={step.key} className="flex flex-1 items-stretch gap-3">
                <div
                  className={cn(
                    "relative flex min-w-0 flex-1 flex-col rounded-xl border px-3 py-3 transition-colors",
                    current && "border-primary/30 bg-primary-light shadow-[0_0_0_3px_rgb(var(--color-primary)/0.08)]",
                    done && "border-success/20 bg-success/5",
                    failed && "border-danger/25 bg-danger/5",
                    !current && !done && !failed && "border-border bg-surface-subtle/50",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        current && "bg-primary text-white",
                        done && "bg-success text-white",
                        failed && "bg-danger text-white",
                        !current && !done && !failed && "bg-white text-muted ring-1 ring-border",
                      )}
                    >
                      {current ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text">{step.label}</p>
                      <p className="text-[11px] text-muted">
                        {current
                          ? `${step.progress}%`
                          : step.status === "idle"
                            ? "待機"
                            : JOB_STATUS_LABELS[step.status as keyof typeof JOB_STATUS_LABELS] ?? step.status}
                      </p>
                    </div>
                  </div>
                  {current ? (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                        <div
                          className="monitor-progress-fill h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.max(step.progress, 6)}%` }}
                        />
                      </div>
                      <p className="monitor-note-enter mt-2 truncate text-[12px] text-text">{step.note ?? "処理中…"}</p>
                    </div>
                  ) : step.note ? (
                    <p className="mt-2 line-clamp-2 text-[12px] text-muted">{step.note}</p>
                  ) : null}
                </div>
                {index < data.steps.length - 1 ? (
                  <div className="hidden w-8 shrink-0 items-center sm:flex" aria-hidden>
                    <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-border">
                      {current || done ? (
                        <span className="monitor-connector-flow absolute inset-y-0 w-1/2 bg-primary/70" />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {data.active ? (
          <div className="mt-5 rounded-xl border border-primary/15 bg-surface-subtle px-4 py-3">
            <p className="text-[13px] font-medium text-text">
              いま: {JOB_TYPE_LABELS[data.active.jobType]}
              {data.active.companyId ? "（1社）" : ""}
            </p>
            {feed.length > 0 ? (
              <ol className="mt-2 space-y-1.5">
                {feed.map((note, i) => (
                  <li
                    key={`${note}-${i}`}
                    className={cn("text-[12px]", i === 0 ? "monitor-note-enter font-medium text-text" : "text-muted")}
                  >
                    {i === 0 ? "● " : "○ "}
                    {note}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-[12px] text-muted">{data.active.progressNote ?? "開始しています…"}</p>
            )}
          </div>
        ) : data.report ? (
          <LedgerReport report={data.report} />
        ) : focus ? (
          <div className="mt-5 text-[13px]">
            <p>
              直近 {JOB_TYPE_LABELS[focus.jobType]}
              {focus.status === "failed" && focus.errorMessage ? ` / ${focus.errorMessage}` : null}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">{formatDateTime(focus.finishedAt ?? focus.createdAt)}</p>
          </div>
        ) : (
          <p className="mt-5 text-[13px] text-muted">まだ実行がありません。右下の実行から台帳を更新できます。</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {data.pendingProposalCount > 0 ? (
            <Link href="/nodes">
              <Badge variant="warning">ノード提案 {data.pendingProposalCount}</Badge>
            </Link>
          ) : null}
          {data.outOfCoverageCount > 0 ? (
            <Link href="/companies">
              <Badge variant="warning">エリア外 {data.outOfCoverageCount}</Badge>
            </Link>
          ) : null}
          {data.crawlFailedCount > 0 ? (
            <Link href="/nodes">
              <Badge variant="danger">クロール失敗 {data.crawlFailedCount}</Badge>
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-[13px]">
          <Link href="/intro-requests" className="text-primary hover:underline">
            依頼キュー
          </Link>
          <Link href="/companies" className="text-primary hover:underline">
            候補一覧
          </Link>
          <Link href="/nodes" className="text-primary hover:underline">
            名簿ノード
          </Link>
          <Link href="/admin" className="text-primary hover:underline">
            履歴
          </Link>
        </div>
      </div>

      {canRun ? (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
          {runError ? (
            <p className="max-w-[16rem] rounded-md border border-danger/30 bg-white px-3 py-2 text-[12px] text-danger shadow-lg">
              {runError}
            </p>
          ) : null}
          {menuOpen ? (
            <div className="w-56 rounded-xl border border-border bg-white p-2 shadow-lg">
              <Button
                variant="ghost"
                className="mb-0.5 w-full justify-start"
                disabled={live || pending}
                loading={pending && !runningExtra}
                onClick={() => start("ledger_update")}
              >
                台帳を更新
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled={live || pending}
                loading={pending && runningExtra}
                onClick={() => start("node_discovery")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                ノード提案
              </Button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => (menuOpen ? setMenuOpen(false) : start("ledger_update"))}
            className={cn(
              "inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-medium text-white shadow-lg hover:bg-primary-hover",
              live && "pr-3",
            )}
            aria-expanded={menuOpen}
          >
            {live ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            {live ? "実行中" : "台帳を更新"}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="text-[11px] text-muted hover:text-text"
          >
            {menuOpen ? <X className="inline h-3 w-3" /> : null}
            {menuOpen ? " 閉じる" : "その他…"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
