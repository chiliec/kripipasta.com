import { cookies } from "next/headers";
import { sessionToken, verifySession } from "@/lib/admin-auth";

const COOKIE = "admin_session";

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  return s;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(COOKIE)?.value, secret());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sessionToken(secret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
