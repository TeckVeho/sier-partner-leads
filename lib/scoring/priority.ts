import type { Priority } from "@prisma/client";

export type ScoreBand = "high" | "medium" | "low" | "none";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  if (score > 0) return "low";
  return "none";
}

export function determinePriority(icpScore: number, pathScore: number): Priority {
  const icp = scoreBand(icpScore);
  const path = scoreBand(pathScore);

  if (icp === "high" && path === "high") return "A";
  if (icp === "high" && path === "medium") return "B";
  if (icp === "medium" && path === "high") return "B";
  if (icp === "high" && (path === "low" || path === "none")) return "C";
  if (icp === "medium" && (path === "medium" || path === "low")) return "hold";
  return "hold";
}
