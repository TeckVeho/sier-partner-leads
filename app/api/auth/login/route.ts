import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/server";
import { checkDatabaseConnection } from "@/lib/db-health";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const db = await checkDatabaseConnection();
    if (!db.ok) {
      return NextResponse.json({ message: db.message }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ message: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { message: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    const message =
      error instanceof Error && error.message.includes("SESSION_SECRET")
        ? "サーバー設定エラー: .env に SESSION_SECRET（32文字以上）を設定してください。"
        : "ログイン処理中にエラーが発生しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
