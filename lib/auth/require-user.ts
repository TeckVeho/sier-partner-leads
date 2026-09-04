import { getUserById, isAdmin } from "@/lib/auth/server";
import { getSessionFromCookies } from "@/lib/session";
import type { AuthUser } from "@/lib/types";

export async function requireUser(options?: { adminOnly?: boolean }): Promise<AuthUser> {
  const session = await getSessionFromCookies();
  if (!session) throw new Error("Unauthorized");
  const user = await getUserById(session.id);
  if (!user) throw new Error("Unauthorized");
  if (options?.adminOnly && !isAdmin(user)) throw new Error("Forbidden");
  return user;
}
