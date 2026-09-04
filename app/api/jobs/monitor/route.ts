import { NextResponse } from "next/server";
import { getExecutionMonitor } from "@/app/actions/jobs";

export async function GET() {
  try {
    const snapshot = await getExecutionMonitor();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
