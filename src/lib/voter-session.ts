import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE = "voter_id";
const MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

/** Current anonymous voter id, or undefined if this browser has never voted. */
export async function getVoterId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE)?.value || undefined;
}

/**
 * Read the voter id, minting and persisting a fresh one when absent.
 * The cookie is httpOnly — it identifies a browser for vote de-duplication,
 * not a logged-in user, and is never read client-side.
 */
export async function getOrCreateVoterId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
  });
  return id;
}
