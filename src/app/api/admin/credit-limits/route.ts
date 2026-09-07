import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { organizations, auditLogs, ledgerAccounts } from "@/lib/db/schema";
const inputSchema = z.object({
  organizationId: z.string().uuid(),
  creditLimit: z.coerce.number().nonnegative().max(1000000),
  reason: z.string().trim().min(10).max(2000)
});
export async function POST(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return new Response(null, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return new Response(null, { status: 400 });
  const input = parsed.data;
  const updated = await getDb().transaction(async (tx) => {
    await tx
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.organizationId, input.organizationId))
      .for("update");
    const [organization] = await tx
      .select({ id: organizations.id, creditLimitKurus: organizations.creditLimitKurus })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .for("update")
      .limit(1);
    if (!organization) return false;
    const creditLimitKurus = Math.round(input.creditLimit * 100);
    await tx
      .update(organizations)
      .set({ creditLimitKurus, updatedAt: new Date() })
      .where(eq(organizations.id, organization.id));
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: organization.id,
      action: "CREDIT_LIMIT_UPDATED",
      targetType: "organization",
      targetId: organization.id,
      safeBefore: { creditLimitKurus: organization.creditLimitKurus },
      safeAfter: { creditLimitKurus },
      reason: input.reason,
      correlationId: randomUUID()
    });
    return true;
  });
  return NextResponse.json({ ok: updated }, { status: updated ? 200 : 404 });
}
