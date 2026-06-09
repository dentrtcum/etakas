import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";

export const appSessionCookieName = "e_takas_session";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function setAppSessionCookie(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const db = getDb();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt
  });

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
  if (!token) return null;

  const db = getDb();
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return session?.userId ?? null;
}
