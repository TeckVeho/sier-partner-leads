import { NextResponse } from "next/server";
import { listRecentJobs } from "@/app/actions/jobs";

export async function GET() {
  const jobs = await listRecentJobs(10);
  return NextResponse.json(
    jobs.map((j) => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
    })),
  );
}
