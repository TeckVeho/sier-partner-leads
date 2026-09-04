export type UserRole = "admin" | "member";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type SessionPayload = AuthUser & {
  exp: number;
};
