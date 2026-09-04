"use server";

import { requireUser } from "@/lib/auth/require-user";
import { getCoveragePrefectures } from "@/lib/settings/target-areas";

export async function listTargetPrefectures() {
  await requireUser();
  return getCoveragePrefectures();
}
