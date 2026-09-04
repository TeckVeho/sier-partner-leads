import { PageHeader } from "@/components/layout/PageHeader";

export function PlaceholderPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border bg-white px-4 py-10 text-center">
        <p className="text-[13px] text-muted">この画面は {phase} で実装予定です。</p>
      </div>
    </>
  );
}
