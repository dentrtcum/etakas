import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AppSessionUser } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import { auditLogs, notifications, organizationMembers, organizations } from "@/lib/db/schema";
import { SecurityError } from "@/lib/security/request-guards";

export async function listUserNotifications(userId: string, limit = 100) {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function listUnreadAnnouncements(userId: string) {
  return getDb()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isAnnouncement, true),
        isNull(notifications.readAt)
      )
    )
    .orderBy(notifications.createdAt)
    .limit(10);
}

export async function getNavigationBadgeCounts(userId: string) {
  const [allUnread, unreadMessages] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "NEW_MESSAGE"),
          isNull(notifications.readAt)
        )
      )
  ]);
  return {
    notifications: allUnread[0]?.value ?? 0,
    messages: unreadMessages[0]?.value ?? 0
  };
}

export async function markMessageNotificationsRead(userId: string, messageIds: string[]) {
  const ids = z.array(z.string().uuid()).max(500).parse(messageIds);
  if (!ids.length) return { ok: true };
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, "NEW_MESSAGE"),
        inArray(notifications.messageId, ids),
        isNull(notifications.readAt)
      )
    );
  return { ok: true };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  notificationId = z.string().uuid().parse(notificationId);
  const [updated] = await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  if (!updated) throw new SecurityError("NOTIFICATION_NOT_FOUND", 404);
  return updated;
}

export async function sendAdminAnnouncement({
  actor,
  organizationId,
  title,
  body
}: {
  actor: AppSessionUser;
  organizationId?: string;
  title: string;
  body: string;
}) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  title = z.string().trim().min(3).max(180).parse(title);
  body = z.string().trim().min(3).max(4000).parse(body);
  if (organizationId) organizationId = z.string().uuid().parse(organizationId);
  const db = getDb();
  return db.transaction(async (tx) => {
    const approvedOrganizations = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        organizationId
          ? and(eq(organizations.id, organizationId), eq(organizations.status, "APPROVED"))
          : eq(organizations.status, "APPROVED")
      );
    if (!approvedOrganizations.length) throw new SecurityError("ORGANIZATION_NOT_FOUND", 404);
    const organizationIds = approvedOrganizations.map((item) => item.id);
    const members = await tx
      .select({ userId: organizationMembers.userId, organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(inArray(organizationMembers.organizationId, organizationIds));
    const unique = [...new Map(members.map((member) => [member.userId, member])).values()];
    if (unique.length) {
      await tx.insert(notifications).values(
        unique.map((member) => ({
          userId: member.userId,
          organizationId: member.organizationId,
          type: "ANNOUNCEMENT",
          title,
          body,
          isAnnouncement: true
        }))
      );
    }
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: organizationId ?? null,
      action: organizationId ? "ANNOUNCEMENT_SENT_TO_ORGANIZATION" : "ANNOUNCEMENT_SENT_TO_ALL",
      targetType: "notification",
      safeAfter: { recipientCount: unique.length, title },
      correlationId: randomUUID(),
      reason: body
    });
    return { recipientCount: unique.length };
  });
}
