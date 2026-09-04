import Link from "next/link";

export function DistributionList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; count: number; href?: string }>;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (total === 0) {
    return <p className="mt-3 text-[13px] text-muted">{empty ?? "データがありません。"}</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {rows.map((row) => {
        const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
        const content = (
          <>
            <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
              <span className="font-medium text-text">{row.label}</span>
              <span className="tabular-nums text-muted">
                {row.count}（{percent}%）
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((row.count / max) * 100)}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} className="block rounded-md px-0.5 py-0.5 hover:bg-primary-light">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
