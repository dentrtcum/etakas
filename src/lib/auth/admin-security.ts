import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import { auditLogs, securityChallenges, sessions, userRoles, users } from "@/lib/db/schema";
import { securityHash, SecurityError, trustedClientIp } from "@/lib/security/request-guards";

export async function administerUserSecurity(
  actor: AppSessionUser,
  request: Request,
  input: { userId: string; action: "LOCK" | "UNLOCK" | "REVOKE_SESSIONS"; reason: string }
) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  if (input.action === "LOCK" && input.userId === actor.id)
    throw new SecurityError("CANNOT_LOCK_SELF", 400);
  await getDb().transaction(async (tx) => {
    const admins = await tx
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, "SUPER_ADMIN"))
      .for("update");
    if (
      input.action === "LOCK" &&
      admins.length <= 1 &&
      admins.some((admin) => admin.userId === input.userId)
    )
      throw new SecurityError("CANNOT_LOCK_LAST_ADMIN", 400);
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).for("update");
    if (!user) throw new SecurityError("USER_NOT_FOUND", 404);
    await tx
      .update(users)
      .set({
        authVersion: sql`${users.authVersion} + 1`,
        updatedAt: new Date(),
        ...(input.action === "LOCK"
          ? { disabledAt: new Date() }
          : input.action === "UNLOCK"
            ? { disabledAt: null, lockedUntil: null, failedLoginAttempts: 0 }
            : {})
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
        actorUserId: actor.id,
        action: `ADMIN_USER_${input.action}`,
        targetType: "USER",
        targetId: user.id,
        reason: input.reason,
        safeBefore: {
          disabled: Boolean(user.disabledAt),
          locked: Boolean(user.lockedUntil && user.lockedUntil > new Date())
        },
        correlationId: randomUUID(),
        ipHash: securityHash(trustedClientIp(request))
      });
  });
}
