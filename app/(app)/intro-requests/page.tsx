import { listIntroRequests } from "@/app/actions/intro-requests";
import { IntroRequestsClient } from "@/components/intro/IntroRequestsClient";

export default async function IntroRequestsPage() {
  const rows = await listIntroRequests();
  return (
    <IntroRequestsClient
      initialRows={rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
