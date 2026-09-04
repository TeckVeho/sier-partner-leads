import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/types";

export function getAuthMode() {
  return process.env.AUTH_MODE ?? "dev";
}

async function authenticateDev(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const expectedPassword = process.env.DEV_LOGIN_PASSWORD ?? "admin";
  if (password !== expectedPassword) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function authenticateCognito(_email: string, _password: string): Promise<AuthUser | null> {
  // Phase 0: Cognito 連携は AWS デプロイ時に実装
  return null;
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const mode = getAuthMode();
  if (mode === "cognito") {
    return authenticateCognito(email, password);
  }
  return authenticateDev(email, password);
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function isAdmin(user: AuthUser) {
  return user.role === "admin";
}
