import { listCompanies } from "@/app/actions/companies";
import { CompaniesClient } from "@/components/companies/CompaniesClient";
import { checkDatabaseConnection } from "@/lib/db-health";
import { PageHeader } from "@/components/layout/PageHeader";
import { getTargetPrefectures } from "@/lib/settings/target-areas";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return (
      <>
        <PageHeader title="候補一覧" description="データベース接続を確認してください。" />
        <p className="text-[13px] text-danger">{db.message}</p>
      </>
    );
  }

  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const [rows, targetPrefectures] = await Promise.all([listCompanies(), getTargetPrefectures()]);
  return (
    <CompaniesClient
      initialRows={rows}
      targetPrefectures={targetPrefectures}
      initialFilters={{
        status: pick("status") as never,
        priority: pick("priority") as never,
        prefecture: pick("prefecture"),
        q: pick("q"),
        stage: pick("stage"),
        node: pick("node"),
        lostReason: pick("lostReason"),
      }}
    />
  );
}
