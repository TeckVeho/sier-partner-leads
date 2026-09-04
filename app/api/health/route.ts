import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db-health";

export async function GET() {
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return NextResponse.json({ status: "error", message: db.message }, { status: 503 });
  }
  return NextResponse.json({ status: "ok" });
}
