import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";
import type { AppSessionUser } from "@/lib/auth/roles";
import { requireAdmin, requireOrganizationAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  conversationMessages,
  conversations,
  notifications,
  organizationMembers,
  organizations,
  supportMessages,
  supportTickets
} from "@/lib/db/schema";
import { SecurityError } from "@/lib/security/request-guards";

const messageSchema = z.string().trim().min(1).max(4000);
const subjectSchema = z.string().trim().min(3).max(180);

function requireMessagingAccess(actor: AppSessionUser, organizationId: string) {
  const authorization = requireOrganizationAccess(actor, organizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "ORDER_MANAGER",
    "VIEWER"
  ]);
  if (!authorization.allowed) throw new SecurityError(authorization.reason, 403);
}

function orderedPair(left: string, right: string) {
  if (left === right) throw new SecurityError("INVALID_CONVERSATION_PARTIES", 400);
  return left < right ? [left, right] : [right, left];
}

export async function listMessagingOrganizations(organizationId: string) {
  return getDb()
    .select({ id: organizations.id, name: organizations.publicAlias, province: organizations.province })
    .from(organizations)
    .where(and(eq(organizations.status, "APPROVED"), ne(organizations.id, organizationId)))
    .orderBy(organizations.publicAlias);
}

export async function listConversations(actor: AppSessionUser, organizationId: string) {
  requireMessagingAccess(actor, organizationId);
  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.firstOrganizationId, organizationId),
        eq(conversations.secondOrganizationId, organizationId)
      )
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(100);
  const otherIds = rows.map((row) =>
    row.firstOrganizationId === organizationId
      ? row.secondOrganizationId
      : row.firstOrganizationId
  );
  const names = otherIds.length
    ? await db
        .select({ id: organizations.id, name: organizations.publicAlias })
        .from(organizations)
        .where(inArray(organizations.id, otherIds))
    : [];
  return rows.map((row) => ({
    ...row,
    otherOrganizationId:
      row.firstOrganizationId === organizationId
        ? row.secondOrganizationId
        : row.firstOrganizationId,
    otherOrganizationName:
      names.find((item) =>
        item.id ===
        (row.firstOrganizationId === organizationId
          ? row.secondOrganizationId
          : row.firstOrganizationId)
      )?.name ?? "İşletme"
  }));
}

export async function listConversationMessages(
  actor: AppSessionUser,
  organizationId: string,
  conversationId: string
) {
  requireMessagingAccess(actor, organizationId);
  conversationId = z.string().uuid().parse(conversationId);
  const [conversation] = await getDb()
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.firstOrganizationId, organizationId),
          eq(conversations.secondOrganizationId, organizationId)
        )
      )
    )
    .limit(1);
  if (!conversation) throw new SecurityError("FORBIDDEN", 403);
  return getDb()
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt, conversationMessages.id)
    .limit(500);
}

export async function sendOrganizationMessage({
  actor,
  organizationId,
  recipientOrganizationId,
  conversationId,
  body
}: {
  actor: AppSessionUser;
  organizationId: string;
  recipientOrganizationId?: string;
  conversationId?: string;
  body: string;
}) {
  requireMessagingAccess(actor, organizationId);
  body = messageSchema.parse(body);
  const db = getDb();
  return db.transaction(async (tx) => {
    let thread;
    if (conversationId) {
      [thread] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, z.string().uuid().parse(conversationId)),
            or(
              eq(conversations.firstOrganizationId, organizationId),
              eq(conversations.secondOrganizationId, organizationId)
            )
          )
        )
        .limit(1);
    } else {
      const recipientId = z.string().uuid().parse(recipientOrganizationId);
      const [recipient] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(and(eq(organizations.id, recipientId), eq(organizations.status, "APPROVED")))
        .limit(1);
      if (!recipient) throw new SecurityError("RECIPIENT_NOT_FOUND", 404);
      const [firstOrganizationId, secondOrganizationId] = orderedPair(organizationId, recipientId);
      [thread] = await tx
        .insert(conversations)
        .values({ firstOrganizationId, secondOrganizationId })
        .onConflictDoUpdate({
          target: [conversations.firstOrganizationId, conversations.secondOrganizationId],
          set: { updatedAt: new Date() }
        })
        .returning();
    }
    if (!thread) throw new SecurityError("CONVERSATION_NOT_FOUND", 404);
    const participant =
      thread.firstOrganizationId === organizationId || thread.secondOrganizationId === organizationId;
    if (!participant) throw new SecurityError("FORBIDDEN", 403);
    const recipientId =
      thread.firstOrganizationId === organizationId
        ? thread.secondOrganizationId
        : thread.firstOrganizationId;
    const [message] = await tx
      .insert(conversationMessages)
      .values({
        conversationId: thread.id,
        senderOrganizationId: organizationId,
        senderUserId: actor.id,
        body
      })
      .returning();
    await tx.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, thread.id));
    const recipients = await tx
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, recipientId));
    if (recipients.length) {
      await tx.insert(notifications).values(
        recipients.map(({ userId }) => ({
          userId,
          organizationId: recipientId,
          type: "NEW_MESSAGE",
          title: "Yeni işletme mesajı",
          body: "Başka bir işletmeden yeni mesaj aldınız. Mesajlar bölümünden görüntüleyebilirsiniz."
        }))
      );
    }
    return { ...message, conversationId: thread.id };
  });
}

export async function listOwnSupportTickets(actor: AppSessionUser, organizationId: string) {
  requireMessagingAccess(actor, organizationId);
  const db = getDb();
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.organizationId, organizationId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(100);
  const ids = tickets.map((ticket) => ticket.id);
  const messages = ids.length
    ? await db
        .select()
        .from(supportMessages)
        .where(inArray(supportMessages.ticketId, ids))
        .orderBy(supportMessages.createdAt)
    : [];
  return tickets.map((ticket) => ({
    ...ticket,
    messages: messages.filter((message) => message.ticketId === ticket.id)
  }));
}

export async function createSupportTicket({
  actor,
  organizationId,
  kind,
  subject,
  body
}: {
  actor: AppSessionUser;
  organizationId: string;
  kind: string;
  subject: string;
  body: string;
}) {
  requireMessagingAccess(actor, organizationId);
  const parsedKind = z.enum(["COMPLAINT", "REQUEST"]).parse(kind);
  subject = subjectSchema.parse(subject);
  body = messageSchema.parse(body);
  return getDb().transaction(async (tx) => {
    const [ticket] = await tx
      .insert(supportTickets)
      .values({ organizationId, openedByUserId: actor.id, kind: parsedKind, subject })
      .returning();
    await tx.insert(supportMessages).values({ ticketId: ticket.id, senderUserId: actor.id, body });
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId,
      action: "SUPPORT_TICKET_CREATED",
      targetType: "support_ticket",
      targetId: ticket.id,
      correlationId: randomUUID(),
      reason: `Private ${parsedKind.toLowerCase()} sent to administration.`
    });
    return ticket;
  });
}

export async function replyToOwnSupportTicket(
  actor: AppSessionUser,
  organizationId: string,
  ticketId: string,
  body: string
) {
  requireMessagingAccess(actor, organizationId);
  ticketId = z.string().uuid().parse(ticketId);
  body = messageSchema.parse(body);
  return getDb().transaction(async (tx) => {
    const [ticket] = await tx
      .select({ id: supportTickets.id, status: supportTickets.status })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.organizationId, organizationId)
        )
      )
      .limit(1);
    if (!ticket) throw new SecurityError("TICKET_NOT_FOUND", 404);
    if (ticket.status === "CLOSED") throw new SecurityError("TICKET_CLOSED", 409);
    await tx.insert(supportMessages).values({ ticketId, senderUserId: actor.id, body });
    await tx
      .update(supportTickets)
      .set({ status: "OPEN", updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId));
    return { ok: true };
  });
}

export async function listAdminSupportTickets(actor: AppSessionUser) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  const db = getDb();
  const tickets = await db
    .select({
      id: supportTickets.id,
      organizationId: supportTickets.organizationId,
      organizationName: organizations.publicAlias,
      kind: supportTickets.kind,
      subject: supportTickets.subject,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt
    })
    .from(supportTickets)
    .innerJoin(organizations, eq(organizations.id, supportTickets.organizationId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(100);
  const ids = tickets.map((ticket) => ticket.id);
  const messages = ids.length
    ? await db
        .select()
        .from(supportMessages)
        .where(inArray(supportMessages.ticketId, ids))
        .orderBy(supportMessages.createdAt)
    : [];
  return tickets.map((ticket) => ({ ...ticket, messages: messages.filter((m) => m.ticketId === ticket.id) }));
}

export async function replyToSupportTicket(actor: AppSessionUser, ticketId: string, body: string, close = false) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  ticketId = z.string().uuid().parse(ticketId);
  body = messageSchema.parse(body);
  return getDb().transaction(async (tx) => {
    const [ticket] = await tx.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (!ticket) throw new SecurityError("TICKET_NOT_FOUND", 404);
    await tx.insert(supportMessages).values({ ticketId, senderUserId: actor.id, fromAdmin: true, body });
    await tx.update(supportTickets).set({ status: close ? "CLOSED" : "ANSWERED", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
    const recipients = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.organizationId, ticket.organizationId));
    if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, organizationId: ticket.organizationId, type: "SUPPORT_REPLY", title: "Talebiniz yanıtlandı", body })));
    return { ok: true };
  });
}
