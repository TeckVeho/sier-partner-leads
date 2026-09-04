import { cn } from "@/lib/utils";

function ArrowRight({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("hidden shrink-0 text-muted lg:inline", className)}
    >
      →
    </span>
  );
}

function ArrowDown() {
  return (
    <span aria-hidden className="block text-center text-muted lg:hidden">
      ↓
    </span>
  );
}

export function FlowBox({
  title,
  hint,
  tone = "default",
}: {
  title: string;
  hint?: string;
  tone?: "default" | "accent" | "success" | "warning" | "muted";
}) {
  return (
    <div
      className={cn(
        "min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2.5 text-center",
        tone === "default" && "border-border bg-white",
        tone === "accent" && "border-primary/25 bg-primary-light",
        tone === "success" && "border-success/25 bg-success/5",
        tone === "warning" && "border-warning/30 bg-warning/5",
        tone === "muted" && "border-dashed border-border bg-surface-subtle",
      )}
    >
      <p className="text-[13px] font-semibold text-text">{title}</p>
      {hint ? <p className="mt-0.5 text-[11px] leading-4 text-muted">{hint}</p> : null}
    </div>
  );
}

export function FlowRow({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-lg border border-border bg-surface-subtle/60 px-3 py-3">
      {caption ? <figcaption className="mb-2 text-[12px] font-medium text-muted">{caption}</figcaption> : null}
      <div className="flex flex-col items-stretch gap-1.5 lg:flex-row lg:items-center lg:gap-2">
        {children}
      </div>
    </figure>
  );
}

export function FlowStep({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      {children}
      {last ? null : (
        <>
          <ArrowRight />
          <ArrowDown />
        </>
      )}
    </>
  );
}

export function OverallWorkflow() {
  return (
    <FlowRow caption="全体の流れ">
      <FlowStep>
        <FlowBox title="台帳をつくる" hint="ノード → クロール → 採点" tone="accent" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="紹介できる順に動く" hint="依頼 → 承認 → 送信" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="結果を残す" hint="商談 / 提携 / 見送り" />
      </FlowStep>
      <FlowStep last>
        <FlowBox title="ルールを直す" hint="分析 → スコア設定" tone="muted" />
      </FlowStep>
    </FlowRow>
  );
}

export function SetupWorkflow() {
  return (
    <FlowRow caption="初回セットアップ">
      <FlowStep>
        <FlowBox title="1. パートナー" hint="対象エリア" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="2. ノード" hint="同じ場所の名簿" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="3. クロール" hint="台帳に載せる" tone="accent" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="4. 再調査" hint="サイト取得 → AI判定" />
      </FlowStep>
      <FlowStep last>
        <FlowBox title="5. 採点" hint="A / B / C が付く" tone="success" />
      </FlowStep>
    </FlowRow>
  );
}

export function IntroWorkflow() {
  return (
    <FlowRow caption="紹介依頼（自動送信なし）">
      <FlowStep>
        <FlowBox title="AI下書き" hint="候補詳細" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="文面を直す" hint="依頼キュー" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="承認" hint="管理者" tone="warning" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="人が送る" hint="メール等" />
      </FlowStep>
      <FlowStep last>
        <FlowBox title="送信済みにする" hint="記録だけ残す" tone="success" />
      </FlowStep>
    </FlowRow>
  );
}

export function PipelineWorkflow() {
  const stages = [
    "未接触",
    "依頼済",
    "紹介獲得",
    "初回接触",
    "商談",
    "提携",
  ];
  return (
    <figure className="rounded-lg border border-border bg-surface-subtle/60 px-3 py-3">
      <figcaption className="mb-2 text-[12px] font-medium text-muted">パイプライン</figcaption>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {stages.map((label, i) => (
          <FlowStep key={label} last={i === stages.length - 1}>
            <FlowBox title={label} tone={label === "提携" ? "success" : "default"} />
          </FlowStep>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] text-muted">途中から分岐</span>
        <span className="text-muted">→</span>
        <div className="max-w-[10rem]">
          <FlowBox title="見送り" hint="理由は必須" tone="warning" />
        </div>
      </div>
    </figure>
  );
}

export function PathDiagram() {
  return (
    <figure className="rounded-lg border border-border bg-white px-4 py-4">
      <figcaption className="mb-3 text-[12px] font-medium text-muted">紹介経路がつながるとき</figcaption>
      <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-xl border border-border bg-surface-subtle px-3 py-3 text-center">
          <p className="text-[11px] text-muted">既存パートナー</p>
          <p className="mt-1 text-[13px] font-semibold">ダイセーSDC</p>
        </div>
        <p className="hidden text-center text-[12px] text-muted md:block">所属</p>
        <div className="rounded-xl border border-primary/25 bg-primary-light px-3 py-3 text-center">
          <p className="text-[11px] text-muted">共通ノード</p>
          <p className="mt-1 text-[13px] font-semibold">GUSSIA 会員名簿</p>
        </div>
        <p className="hidden text-center text-[12px] text-muted md:block">所属</p>
        <div className="rounded-xl border border-border bg-surface-subtle px-3 py-3 text-center">
          <p className="text-[11px] text-muted">候補企業</p>
          <p className="mt-1 text-[13px] font-semibold">群馬の SIer</p>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-muted">同じノードに両方がいる → 候補詳細に「紹介経路」が出る</p>
    </figure>
  );
}

export function PriorityMatrix() {
  const cells: Array<{ label: string; tone: "success" | "accent" | "warning" | "muted" }> = [
    { label: "B", tone: "accent" },
    { label: "A 最優先", tone: "success" },
    { label: "保留", tone: "muted" },
    { label: "C 後回し", tone: "warning" },
  ];

  return (
    <figure className="rounded-lg border border-border bg-white px-4 py-4">
      <figcaption className="mb-3 text-[12px] font-medium text-muted">優先度マトリクス（ICP × 経路）</figcaption>
      <div className="grid grid-cols-[72px_1fr_1fr] gap-2 text-center text-[12px]">
        <div />
        <p className="text-muted">経路 低</p>
        <p className="text-muted">経路 高</p>
        <p className="flex items-center justify-end pr-1 text-muted">ICP 高</p>
        <MatrixCell {...cells[3]} />
        <MatrixCell {...cells[1]} />
        <p className="flex items-center justify-end pr-1 text-muted">ICP 低</p>
        <MatrixCell {...cells[2]} />
        <MatrixCell {...cells[0]} />
      </div>
      <p className="mt-3 text-[12px] text-muted">
        右上が今すぐ動く案件。左上は良い会社だが紹介しづらいので後回しです。
        パートナー対象エリア外の会社は、点数にかかわらず優先度 C になります。
      </p>
    </figure>
  );
}

function MatrixCell({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "accent" | "warning" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-4 text-[13px] font-semibold",
        tone === "success" && "border-success/25 bg-success/5 text-success",
        tone === "accent" && "border-primary/20 bg-primary-light text-primary",
        tone === "warning" && "border-warning/30 bg-warning/5 text-warning",
        tone === "muted" && "border-border bg-surface-subtle text-muted",
      )}
    >
      {label}
    </div>
  );
}

export function DailyWorkflow() {
  return (
    <FlowRow caption="日常の営業サイクル">
      <FlowStep>
        <FlowBox title="ダッシュボード" hint="滞留を見る" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="候補 A / B" hint="経路を確認" tone="accent" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="依頼キュー" hint="承認して送る" />
      </FlowStep>
      <FlowStep>
        <FlowBox title="パイプライン" hint="進捗を進める" />
      </FlowStep>
      <FlowStep last>
        <FlowBox title="分析" hint="見送り理由" tone="muted" />
      </FlowStep>
    </FlowRow>
  );
}
