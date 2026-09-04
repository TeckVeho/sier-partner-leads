import type { AuthUser } from "@/lib/types";

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: body?.message ?? "メールアドレスまたはパスワードが正しくありません" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "サーバーに接続できません。時間をおいて再度お試しください。" };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}

export type FetchUserResult =
  | { status: "ok"; user: AuthUser }
  | { status: "unauthorized" }
  | { status: "unavailable"; message: string };

export async function fetchCurrentUser(): Promise<FetchUserResult> {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 503) {
      return {
        status: "unavailable",
        message: body?.message ?? "データベースに接続できません。",
      };
    }
    if (!res.ok) return { status: "unauthorized" };
    const user = body?.user as AuthUser | undefined;
    if (!user) return { status: "unauthorized" };
    return { status: "ok", user };
  } catch {
    return { status: "unavailable", message: "サーバーに接続できません。" };
  }
}
