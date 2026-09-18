import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  ledgerAccounts,
  notifications,
  organizationMembers,
  organizations
} from "@/lib/db/schema";
import { mutationRoute } from "@/lib/http/mutation";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
import {
  adjustOverdraftKurus,
  lowerLimitToOverdraftKurus
} from "@/modules/ledger/credit-limits";

const inputSchema = z.object({
  organizationId: z.string().uuid().optional(),
  applyToAll: z.coerce.boolean().default(false),
  operation: z.enum(["SET_LIMITS", "ADJUST_LOWER"]).default("SET_LIMITS"),
  lowerLimit: z.coerce.number().min(-1_000_000).max(0).optional(),
  upperLimit: z.union([z.coerce.number().min(0).max(1_000_000), z.literal("")]).optional(),
  limitDelta: z.coerce.number().min(-1_000_000).max(1_000_000).optional(),
  reason: z.string().trim().min(10).max(2000)
}).superRefine((input, context) => {
  if (!input.applyToAll && !input.organizationId) context.addIssue({ code: "custom", message: "Organization is required." });
  if (input.operation === "SET_LIMITS" && input.lowerLimit === undefined) context.addIssue({ code: "custom", message: "Lower limit is required." });
  if (input.operation === "ADJUST_LOWER" && (!input.limitDelta || input.limitDelta === 0)) context.addIssue({ code: "custom", message: "Non-zero delta is required." });
});

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CREDIT_LIMIT" }, { status: 400 });
  const input = parsed.data;
  const result = await getDb().transaction(async (tx) => {
    await lockAccounting(tx);
    const targets = await tx
      .select({ id: organizations.id, creditLimitKurus: organizations.creditLimitKurus, creditUpperLimitKurus: organizations.creditUpperLimitKurus })
      .from(organizations)
      .where(input.applyToAll ? eq(organizations.status, "APPROVED") : eq(organizations.id, input.organizationId!))
      .for("update");
    if (!targets.length) return { count: 0 };
    const targetIds = targets.map((target) => target.id);
    await tx.select({ id: ledgerAccounts.id }).from(ledgerAccounts).where(inArray(ledgerAccounts.organizationId, targetIds)).for("update");
    for (const target of targets) {
      const creditLimitKurus = input.operation === "ADJUST_LOWER"
        ? adjustOverdraftKurus(target.creditLimitKurus, input.limitDelta!)
        : lowerLimitToOverdraftKurus(input.lowerLimit!);
      const creditUpperLimitKurus = input.operation === "SET_LIMITS"
        ? input.upperLimit === "" || input.upperLimit === undefined
          ? null
          : Math.round(input.upperLimit * 100)
        : target.creditUpperLimitKurus;
      await tx.update(organizations).set({ creditLimitKurus, creditUpperLimitKurus, updatedAt: new Date() }).where(eq(organizations.id, target.id));
      await tx.insert(auditLogs).values({
        actorUserId: actor.id,
        organizationId: target.id,
        action: input.operation === "ADJUST_LOWER" ? "CREDIT_LOWER_LIMIT_ADJUSTED" : "CREDIT_LIMITS_UPDATED",
        targetType: "organization",
        targetId: target.id,
        safeBefore: { creditLimitKurus: target.creditLimitKurus, creditUpperLimitKurus: target.creditUpperLimitKurus },
        safeAfter: { creditLimitKurus, creditUpperLimitKurus },
        reason: input.reason,
        correlationId: randomUUID()
      });
      const members = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.organizationId, target.id));
      if (members.length) await tx.insert(notifications).values(members.map(({ userId }) => ({
        userId,
        organizationId: target.id,
        type: "ADMIN_DECISION",
        title: "Takas kredi sınırlarınız güncellendi",
        body: `Alt sınır: -${(creditLimitKurus / 100).toLocaleString("tr-TR")} TL\nÜst sınır: ${creditUpperLimitKurus === null ? "Sınırsız" : `${(creditUpperLimitKurus / 100).toLocaleString("tr-TR")} TL`}\nGerekçe: ${input.reason}`
      })));
    }
    return { count: targets.length };
  });
  return NextResponse.json({ ok: result.count > 0, ...result }, { status: result.count ? 200 : 404 });
}

export const POST = mutationRoute("src/app/api/admin/credit-limits", handlePost);
