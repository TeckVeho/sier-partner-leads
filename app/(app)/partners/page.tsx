import { listPartners } from "@/app/actions/partners";
import { PartnersClient } from "@/components/partners/PartnersClient";

export default async function PartnersPage() {
  const rows = await listPartners();
  return <PartnersClient initialRows={rows} />;
}
