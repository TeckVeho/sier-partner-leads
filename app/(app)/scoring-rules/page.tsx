import { listScoringRules } from "@/app/actions/scoring";
import { ScoringRulesClient } from "@/components/scoring/ScoringRulesClient";
import { getLatestRulesVersion } from "@/lib/scoring/engine";

export default async function ScoringRulesPage() {
  const [rows, version] = await Promise.all([listScoringRules(), getLatestRulesVersion()]);
  return <ScoringRulesClient initialRows={rows} version={version} />;
}
