"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser, logout as logoutRequest } from "@/lib/auth/client";
import type { AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchCurrentUser();
    if (result.status === "ok") {
      setUser(result.user);
      setErrorMessage(null);
      return;
    }
    if (result.status === "unavailable") {
      setErrorMessage(result.message);
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchCurrentUser();
      if (cancelled) return;
      if (result.status === "ok") {
        setUser(result.user);
        setReady(true);
        return;
      }
      if (result.status === "unavailable") {
        setErrorMessage(result.message);
        setReady(true);
        return;
      }
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await logoutRequest();
    setUser(null);
    router.push("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-[13px] text-muted">
        読み込み中…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="max-w-lg rounded-lg border border-danger/30 bg-white px-5 py-4 text-[13px]">
          <p className="font-medium text-danger">起動エラー</p>
          <p className="mt-2 text-text">{errorMessage}</p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-bg px-3 py-2 text-[12px] text-muted">
            docker-compose up -d{"\n"}
            npm run db:migrate{"\n"}
            npm run db:seed
          </pre>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-[13px] text-muted">
        読み込み中…
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, refresh, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider の内側で使用してください");
  }
  return ctx;
}
