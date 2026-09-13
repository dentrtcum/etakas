import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

export const appSessionCookieName = "e_takas_session";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

// Only called after a transaction consumes the email proof and persists the session.
export async function setAppSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(appSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearAppSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(appSessionCookieName)?.value;

  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  cookieStore.delete(appSessionCookieName);
}

export async function getSessionUserIdFromCookie() {
  const token = (await cookies()).get(appSessionCookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const db = getDb();
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(sessions.authVersion, users.authVersion),
        isNotNull(sessions.emailVerifiedAt),
        eq(users.emailVerified, true),
        isNull(users.disabledAt),
        or(isNull(users.lockedUntil), lt(users.lockedUntil, new Date()))
      )
    )
    .limit(1);

  return session?.userId ?? null;
}
