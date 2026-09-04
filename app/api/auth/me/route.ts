import { NextResponse } from "next/server";
import { getUserById } from "@/lib/auth/server";
import { checkDatabaseConnection } from "@/lib/db-health";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const db = await checkDatabaseConnection();
  if (!db.ok) {
    return NextResponse.json({ user: null, message: db.message }, { status: 503 });
  }

  const user = await getUserById(session.id);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
