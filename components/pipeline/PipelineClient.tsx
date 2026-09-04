"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, FilterChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PIPELINE_LABELS, PIPELINE_ORDER, PRIORITY_LABELS } from "@/lib/scoring/labels";
import { movePipelineStage } from "@/app/actions/pipeline";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@prisma/client";

type BoardCard = {
  id: string;
  name: string;
  prefecture: string | null;
  priority: string;
  stage: PipelineStage;
  lostReason: string | null;
};

type PriorityFilter = "" | "A" | "B" | "C" | "hold";

function priorityVariant(priority: string): "success" | "warning" | "muted" {
  if (priority === "A") return "success";
  if (priority === "B") return "warning";
  return "muted";
}

const STAGE_TONE: Record<
  PipelineStage,
  { well: string; title: string; count: string; bar: string }
> = {
  not_contacted: {
    well: "bg-stone-100",
    title: "text-stone-700",
    count: "bg-stone-200 text-stone-700",
    bar: "bg-stone-400",
  },
  requested: {
    well: "bg-sky-50",
    title: "text-sky-800",
    count: "bg-sky-100 text-sky-800",
    bar: "bg-sky-400",
  },
  intro_obtained: {
    well: "bg-cyan-50",
    title: "text-cyan-800",
    count: "bg-cyan-100 text-cyan-800",
    bar: "bg-cyan-400",
  },
  first_contact: {
    well: "bg-amber-50",
    title: "text-amber-900",
    count: "bg-amber-100 text-amber-900",
    bar: "bg-amber-400",
  },
  meeting: {
    well: "bg-orange-50",
    title: "text-orange-900",
    count: "bg-orange-100 text-orange-900",
    bar: "bg-orange-400",
  },
  partnership: {
    well: "bg-emerald-50",
    title: "text-emerald-800",
    count: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  },
  lost: {
    well: "bg-rose-50",
    title: "text-rose-800",
    count: "bg-rose-100 text-rose-800",
    bar: "bg-rose-400",
  },
};

export function PipelineClient({ initialCards }: { initialCards: BoardCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PipelineStage | null>(null);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("");
  const [lostReason, setLostReason] = useState("");
  const [pendingLost, setPendingLost] = useState<{ companyId: string; stage: PipelineStage } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draggedRef = useRef(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (priority && card.priority !== priority) return false;
      if (!q) return true;
      return card.name.toLowerCase().includes(q) || (card.prefecture ?? "").toLowerCase().includes(q);
    });
  }, [cards, query, priority]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(PIPELINE_ORDER.map((stage) => [stage, [] as BoardCard[]])) as Record<
      PipelineStage,
      BoardCard[]
    >;
    for (const card of visible) {
      map[card.stage]?.push(card);
    }
    return map;
  }, [visible]);

  function moveCard(companyId: string, stage: PipelineStage, reason?: string) {
    if (stage === "lost" && !reason?.trim()) {
      setPendingLost({ companyId, stage });
      setLostReason("");
      return;
    }
    const previous = cards;
    setCards((prev) =>
      prev.map((card) =>
        card.id === companyId ? { ...card, stage, lostReason: reason ?? card.lostReason } : card,
      ),
    );
    setPendingLost(null);
    setLostReason("");
    setError(null);
    startTransition(async () => {
      try {
        await movePipelineStage({ companyId, stage, lostReason: reason });
      } catch (e) {
        setCards(previous);
        setError(e instanceof Error ? e.message : "移動に失敗しました");
      }
    });
  }

  function handleDragStart(companyId: string, event: React.DragEvent<HTMLDivElement>) {
    draggedRef.current = true;
    setDraggingId(companyId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", companyId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }

  function handleDrop(stage: PipelineStage) {
    const companyId = draggingId;
    if (!companyId) return;
    const card = cards.find((item) => item.id === companyId);
    handleDragEnd();
    if (!card || card.stage === stage) return;
    moveCard(companyId, stage);
  }

  const draggingCard = draggingId ? cards.find((card) => card.id === draggingId) : null;

  return (
    <>
      <PageHeader
        title="パイプライン"
        description="カードを列へドラッグして進めます。見送りへ移すときは理由を聞きます。"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="会社名・都道府県で絞り込み"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          wrapperClassName="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {([
            ["", "すべて"],
            ["A", "A"],
            ["B", "B"],
            ["C", "C"],
            ["hold", "保留"],
          ] as const).map(([value, label]) => (
            <FilterChip
              key={value || "all"}
              label={label}
              active={priority === value}
              onClick={() => setPriority(value)}
            />
          ))}
        </div>
        <p className="ml-auto text-[12px] text-muted">{visible.length} 件</p>
      </div>

      {error ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}

      <div className="-mx-5 overflow-x-auto px-5 pb-2 lg:-mx-8 lg:px-8">
        <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] min-w-max gap-3">
          {PIPELINE_ORDER.map((stage) => {
            const columnCards = grouped[stage] ?? [];
            const isTarget = dropTarget === stage;
            const showPlaceholder = Boolean(draggingCard && isTarget && draggingCard.stage !== stage);
            const tone = STAGE_TONE[stage];
            return (
              <section key={stage} className="flex w-[300px] shrink-0 flex-col">
                <header className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.bar)} />
                    <h3 className={cn("truncate text-[13px] font-semibold", tone.title)}>
                      {PIPELINE_LABELS[stage]}
                    </h3>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] tabular-nums", tone.count)}>
                    {columnCards.length}
                  </span>
                </header>
                <div
                  className={cn(
                    "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-shadow",
                    tone.well,
                    isTarget && "ring-2 ring-primary/40 ring-offset-2 ring-offset-bg",
                    pending && "pointer-events-none opacity-80",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTarget(stage);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(stage);
                  }}
                >
                  {showPlaceholder ? (
                    <div className="h-16 rounded-md border-2 border-dashed border-primary/35 bg-white/70" />
                  ) : null}
                  {columnCards.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(card.id, e)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-md border border-border bg-white px-3 py-2.5 shadow-sm",
                        draggingId === card.id && "opacity-40",
                      )}
                    >
                      <Link
                        href={`/companies/${card.id}`}
                        onClick={(e) => {
                          if (draggedRef.current) e.preventDefault();
                        }}
                        className="block text-[13px] font-semibold text-text hover:underline"
                      >
                        {card.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {card.prefecture ? (
                          <span className="text-[11px] text-muted">{card.prefecture}</span>
                        ) : null}
                        <Badge variant={priorityVariant(card.priority)}>
                          {PRIORITY_LABELS[card.priority as keyof typeof PRIORITY_LABELS] ?? card.priority}
                        </Badge>
                        {card.stage === "lost" && card.lostReason ? (
                          <span className="truncate text-[11px] text-muted">{card.lostReason}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {columnCards.length === 0 && !showPlaceholder ? (
                    <p className="px-1 py-6 text-center text-[12px] text-muted">カードなし</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Modal open={!!pendingLost} title="見送り理由" onClose={() => setPendingLost(null)}>
        <p className="mb-3 text-[13px] text-muted">見送り列へ移すには理由が必要です。分析に使います。</p>
        <textarea
          className="min-h-24 w-full rounded-md border border-border px-3 py-2 text-[13px]"
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          placeholder="見送り理由"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingLost(null)}>
            キャンセル
          </Button>
          <Button
            loading={pending}
            disabled={!lostReason.trim()}
            onClick={() => pendingLost && moveCard(pendingLost.companyId, pendingLost.stage, lostReason)}
          >
            見送りにする
          </Button>
        </div>
      </Modal>
    </>
  );
}
