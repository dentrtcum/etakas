import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLogs, loginEvents, securityChallenges, sessions, users } from "@/lib/db/schema";
import { createSessionToken, hashSessionToken } from "@/lib/auth/app-session";
import { hashPasswordAsync, passwordPolicySchema, verifyPasswordAsync } from "@/lib/auth/password";
import { requireEmailConfigured, sendSecurityEmail } from "@/lib/email/send";
import { requireAdmin } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";
import {
  applicationOrigin,
  safeNextPath,
  securityHash,
  SecurityError,
  trustedClientIp
} from "@/lib/security/request-guards";

export const challengeCookieName = "e_takas_email_challenge";
export const challengeLifetimeSeconds = 600;
export const maximumChallengeAttempts = 5;
const lockMinutes = 15;
type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export function challengeSecretHash(id: string, secret: string) {
  const pepper = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!pepper || pepper.length < 32) throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  return createHmac("sha256", pepper).update(`${id}:${secret}`).digest("hex");
}
export function matchesChallengeSecret(id: string, secret: string, expected: string) {
  const actual = challengeSecretHash(id, secret);
  return (
    /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}
export function parseChallengeToken(value: unknown) {
  if (typeof value !== "string") return null;
  const match =
    /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.([A-Za-z0-9_-]{43})$/.exec(
      value
    );
  return match ? { id: match[1], secret: match[2] } : null;
}
function requestHashes(request: Request) {
  return {
    ipHash: securityHash(trustedClientIp(request)),
    userAgentHash: securityHash((request.headers.get("user-agent") || "unknown").slice(0, 1024))
  };
}
async function recordLogin(
  tx: DbTransaction,
  request: Request,
  email: string,
  userId: string | null,
  successful: boolean,
  reason: string
) {
  await tx
    .insert(loginEvents)
    .values({ email, userId, successful, reason, ...requestHashes(request) });
}
async function failLogin(tx: DbTransaction, user: typeof users.$inferSelect) {
  // The caller locks the user before updating counters. Expired locks start a new cycle.
  const count =
    user.lockedUntil && user.lockedUntil <= new Date() ? 1 : user.failedLoginAttempts + 1;
  await tx
    .update(users)
    .set({
      failedLoginAttempts: count >= maximumChallengeAttempts ? 0 : count,
      lockedUntil:
        count >= maximumChallengeAttempts ? new Date(Date.now() + lockMinutes * 60000) : null,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));
}

export async function startLogin(request: Request, email: string, password: string, next: unknown) {
  requireEmailConfigured();
  const db = getDb();
  const [snapshot] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordValid = await verifyPasswordAsync(password, snapshot?.passwordHash ?? null);
  if (!snapshot) {
    await db.transaction((tx) =>
      recordLogin(tx, request, email, null, false, "INVALID_CREDENTIALS")
    );
    throw new SecurityError("INVALID_CREDENTIALS", 401);
  }
  const id = randomUUID();
  const code = String(randomInt(10000000, 100000000));
  const browserSecret = randomBytes(32).toString("base64url");
  const outcome = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, snapshot.id)).for("update");
    if (
      !user ||
      user.disabledAt ||
      user.passwordHash !== snapshot.passwordHash ||
      user.authVersion !== snapshot.authVersion ||
      (user.lockedUntil && user.lockedUntil > new Date())
    )
      return "INVALID_CREDENTIALS";
    if (!passwordValid) {
      await failLogin(tx, user);
      await recordLogin(tx, request, email, user.id, false, "INVALID_CREDENTIALS");
      return "INVALID_CREDENTIALS";
    }
    if (!passwordPolicySchema.safeParse(password).success) return "PASSWORD_UPGRADE_REQUIRED";
    await tx
      .update(securityChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(securityChallenges.userId, user.id),
          eq(securityChallenges.purpose, "LOGIN"),
          isNull(securityChallenges.consumedAt)
        )
      );
    await tx
      .insert(securityChallenges)
      .values({
        id,
        userId: user.id,
        purpose: "LOGIN",
        authVersion: user.authVersion,
        secretHash: challengeSecretHash(id, code),
        browserHash: challengeSecretHash(id, browserSecret),
        nextPath: safeNextPath(next),
        expiresAt: new Date(Date.now() + challengeLifetimeSeconds * 1000)
      });
    return "OK";
  });
  if (outcome !== "OK") throw new SecurityError(outcome, 401);
  try {
    await sendSecurityEmail({
      to: email,
      subject: "Etakas giriş doğrulama kodunuz",
      text: `Etakas giriş kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir ve yalnızca giriş başlattığınız tarayıcıda kullanılabilir. Kodu kimseyle paylaşmayın. Bu işlemi siz başlatmadıysanız hesabınızın parolasını yenileyin.\n\nSabot Yazılım · Etakas`,
      idempotencyKey: `login-${id}`
    });
  } catch (error) {
    await db
      .update(securityChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(securityChallenges.id, id));
    throw error;
  }
  return `${id}.${browserSecret}`;
}

export async function finishLogin(request: Request, cookieToken: unknown, code: string) {
  const parsed = parseChallengeToken(cookieToken);
  if (!parsed || !/^\d{8}$/.test(code)) throw new SecurityError("INVALID_CODE", 400);
  const db = getDb();
  const [snapshot] = await db
    .select()
    .from(securityChallenges)
    .where(eq(securityChallenges.id, parsed.id))
    .limit(1);
  if (!snapshot || snapshot.purpose !== "LOGIN") throw new SecurityError("INVALID_CODE", 400);
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, snapshot.userId)).for("update");
    const [challenge] = await tx
      .select()
      .from(securityChallenges)
      .where(eq(securityChallenges.id, parsed.id))
      .for("update");
    if (
      !user ||
      user.disabledAt ||
      !challenge ||
      challenge.purpose !== "LOGIN" ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= maximumChallengeAttempts ||
      challenge.authVersion !== user.authVersion ||
      (user.lockedUntil && user.lockedUntil > new Date()) ||
      !matchesChallengeSecret(challenge.id, parsed.secret, challenge.browserHash || "")
    )
      return null;
    if (!matchesChallengeSecret(challenge.id, code, challenge.secretHash)) {
      await tx
        .update(securityChallenges)
        .set({
          attempts: challenge.attempts + 1,
          ...(challenge.attempts + 1 >= maximumChallengeAttempts ? { consumedAt: new Date() } : {})
        })
        .where(eq(securityChallenges.id, challenge.id));
      await failLogin(tx, user);
      await recordLogin(tx, request, user.email, user.id, false, "INVALID_EMAIL_CODE");
      return null;
    }
    await tx
      .update(securityChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(securityChallenges.id, challenge.id));
    await tx
      .update(users)
      .set({
        emailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    await tx
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: hashSessionToken(token),
        authVersion: user.authVersion,
        emailVerifiedAt: new Date(),
        expiresAt,
        ...requestHashes(request)
      });
    await recordLogin(tx, request, user.email, user.id, true, "PASSWORD_AND_EMAIL_VERIFIED");
    return { token, expiresAt, nextPath: safeNextPath(challenge.nextPath) };
  });
  if (!result) throw new SecurityError("INVALID_CODE", 400);
  return result;
}

export async function requestPasswordReset(
  request: Request,
  email: string,
  admin?: AppSessionUser & { reason: string }
) {
  if (admin && !requireAdmin(admin).allowed) throw new SecurityError("FORBIDDEN", 403);
  requireEmailConfigured();
  const db = getDb();
  const id = randomUUID();
  const secret = randomBytes(32).toString("base64url");
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.email, email)).for("update");
    if (!user || user.disabledAt) return false;
    await tx
      .insert(securityChallenges)
      .values({
        id,
        userId: user.id,
        purpose: "PASSWORD_RESET",
        secretHash: challengeSecretHash(id, secret),
        authVersion: user.authVersion,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000)
      });
    if (admin)
      await tx
        .insert(auditLogs)
        .values({
          actorUserId: admin.id,
          action: "ADMIN_PASSWORD_RESET_REQUESTED",
          targetType: "USER",
          targetId: user.id,
          reason: admin.reason,
          correlationId: randomUUID(),
          ...requestHashes(request)
        });
    return true;
  });
  if (!result) return;
  const link = `${applicationOrigin()}/parola-yenile?token=${id}.${secret}`;
  const deliver = async () => {
    try {
      await sendSecurityEmail({
        to: email,
        subject: "Etakas parola yenileme",
        text: `Etakas parolanızı yenilemek için aşağıdaki bağlantıyı açın:\n${link}\n\nBağlantı 20 dakika geçerlidir ve yalnızca bir kez kullanılabilir. ${admin ? "Bu isteği platform yöneticisi başlattı. " : ""}Parola değiştiğinde mevcut oturumlarınız kapatılır. İşlemi onaylamak istemiyorsanız bu mesajı yok sayın.\n\nSabot Yazılım · Etakas`,
        idempotencyKey: `reset-${id}`
      });
    } catch (error) {
      console.error("[security-email] password reset delivery failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        code: error instanceof SecurityError ? error.code : "UNEXPECTED"
      });
      await db
        .update(securityChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(securityChallenges.id, id));
      // Public reset responses must not disclose whether an email is registered.
      if (admin) throw error;
    }
  };
  // Avoid exposing registered addresses through email-provider response latency.
  if (admin) await deliver();
  else after(deliver);
}

export async function finishPasswordReset(request: Request, rawToken: unknown, password: string) {
  const parsed = parseChallengeToken(rawToken);
  if (!parsed) throw new SecurityError("INVALID_RESET_LINK", 400);
  if (!passwordPolicySchema.safeParse(password).success)
    throw new SecurityError("WEAK_PASSWORD", 400);
  const db = getDb();
  const [snapshot] = await db
    .select()
    .from(securityChallenges)
    .where(eq(securityChallenges.id, parsed.id))
    .limit(1);
  if (
    !snapshot ||
    snapshot.purpose !== "PASSWORD_RESET" ||
    snapshot.consumedAt ||
    snapshot.expiresAt <= new Date() ||
    !matchesChallengeSecret(parsed.id, parsed.secret, snapshot.secretHash)
  )
    throw new SecurityError("INVALID_RESET_LINK", 400);
  const passwordHash = await hashPasswordAsync(password);
  const changed = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, snapshot.userId)).for("update");
    const [challenge] = await tx
      .select()
      .from(securityChallenges)
      .where(eq(securityChallenges.id, parsed.id))
      .for("update");
    if (
      !user ||
      user.disabledAt ||
      !challenge ||
      challenge.purpose !== "PASSWORD_RESET" ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.authVersion !== user.authVersion ||
      !matchesChallengeSecret(parsed.id, parsed.secret, challenge.secretHash)
    )
      return false;
    await tx
      .update(users)
      .set({
        passwordHash,
        emailVerified: true,
        authVersion: sql`${users.authVersion} + 1`,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx
      .update(securityChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(securityChallenges.userId, user.id), isNull(securityChallenges.consumedAt)));
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        targetType: "USER",
        targetId: user.id,
        correlationId: randomUUID(),
        ...requestHashes(request)
      });
    return true;
  });
  if (!changed) throw new SecurityError("INVALID_RESET_LINK", 400);
}
