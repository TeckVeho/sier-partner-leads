import { listAuditLogs, listCrawlRuns, listRecentJobs } from "@/app/actions/jobs";
import { AdminClient } from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const [jobs, audits, crawlRuns] = await Promise.all([
    listRecentJobs(),
    listAuditLogs(),
    listCrawlRuns(),
  ]);

  return (
    <AdminClient
      jobs={jobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() }))}
      audits={audits.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
      crawlRuns={crawlRuns.map((c) => ({ ...c, startedAt: c.startedAt.toISOString() }))}
    />
  );
}
