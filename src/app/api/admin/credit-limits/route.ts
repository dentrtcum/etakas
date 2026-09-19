import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  balanceHolds,
  ledgerAccounts,
  ledgerEntries,
  ledgerTransactions,
  notifications,
  orders,
  organizationMembers,
  organizations
} from "@/lib/db/schema";
import { mutationRoute } from "@/lib/http/mutation";
import { SecurityError } from "@/lib/security/request-guards";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
import { lowerLimitToOverdraftKurus } from "@/modules/ledger/credit-limits";

const OPEN_ORDER_STATUSES = [
  "RESERVED",
  "CONTACT_DETAILS_REVEALED",
  "SELLER_PREPARING",
  "READY_FOR_PICKUP",
  "HANDOVER_DECLARED",
  "BUYER_CONFIRMATION_PENDING",
  "DISPUTED",
  "ADMIN_FROZEN"
] as const;

const inputSchema = z
  .object({
    organizationId: z.string().uuid().optional(),
    applyToAll: z.coerce.boolean().default(false),
    operation: z.enum(["SET_LIMITS", "ADJUST_BALANCE"]).default("SET_LIMITS"),
    lowerLimit: z.coerce.number().min(-1_000_000).max(0).optional(),
    upperLimit: z
      .union([z.coerce.number().min(0).max(1_000_000), z.literal("")])
      .optional(),
    balanceDelta: z.coerce.number().min(-1_000_000).max(1_000_000).optional(),
    reason: z.string().trim().min(10).max(2000)
  })
  .superRefine((input, context) => {
    if (!input.applyToAll && !input.organizationId) {
      context.addIssue({ code: "custom", message: "Organization is required." });
    }
    if (input.operation === "SET_LIMITS" && input.lowerLimit === undefined) {
      context.addIssue({ code: "custom", message: "Lower limit is required." });
    }
    if (
      input.operation === "ADJUST_BALANCE" &&
      (input.applyToAll ||
        !input.balanceDelta ||
        Math.round(input.balanceDelta * 100) === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "A single organization and non-zero balance change are required."
      });
    }
  });

async function handlePost(request: Request) {
  const actor = await getCurrentAppUser();
  if (!actor || !requireAdmin(actor).allowed) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CREDIT_LIMIT" }, { status: 400 });
  }
  const input = parsed.data;
  const result = await getDb().transaction(async (tx) => {
    await lockAccounting(tx);
    const targets = await tx
      .select({
        id: organizations.id,
        creditLimitKurus: organizations.creditLimitKurus,
        creditUpperLimitKurus: organizations.creditUpperLimitKurus
      })
      .from(organizations)
      .where(
        input.applyToAll
          ? eq(organizations.status, "APPROVED")
          : eq(organizations.id, input.organizationId!)
      )
      .for("update");
    if (!targets.length) return { count: 0 };

    const targetIds = targets.map((target) => target.id);
    const accounts = await tx
      .select({ id: ledgerAccounts.id, organizationId: ledgerAccounts.organizationId })
      .from(ledgerAccounts)
      .where(inArray(ledgerAccounts.organizationId, targetIds))
      .for("update");

    for (const target of targets) {
      const account = accounts.find((item) => item.organizationId === target.id);
      if (!account) throw new SecurityError("LEDGER_ACCOUNT_MISSING", 409);
      const [balance] = await tx
        .select({
          value: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'CREDIT' then ${ledgerEntries.amountKurus} else -${ledgerEntries.amountKurus} end), 0)::bigint`
        })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.accountId, account.id));
      const [holds] = await tx
        .select({ value: sql<number>`coalesce(sum(${balanceHolds.amountKurus}), 0)::bigint` })
        .from(balanceHolds)
        .where(
          and(
            eq(balanceHolds.accountId, account.id),
            isNull(balanceHolds.releasedAt),
            isNull(balanceHolds.consumedAt)
          )
        );
      const [pendingSellerCredits] = await tx
        .select({ value: sql<number>`coalesce(sum(${orders.totalReferenceValueKurus}), 0)::bigint` })
        .from(orders)
        .where(
          and(
            eq(orders.sellerOrganizationId, target.id),
            inArray(orders.status, [...OPEN_ORDER_STATUSES])
          )
        );
      const currentBalanceKurus = Number(balance.value);
      const heldKurus = Number(holds.value);
      const pendingIncomingKurus = Number(pendingSellerCredits.value);

      if (input.operation === "SET_LIMITS") {
        const creditLimitKurus = lowerLimitToOverdraftKurus(input.lowerLimit!);
        const creditUpperLimitKurus =
          input.upperLimit === "" || input.upperLimit === undefined
            ? null
            : Math.round(input.upperLimit * 100);
        if (
          currentBalanceKurus - heldKurus < -creditLimitKurus ||
          (creditUpperLimitKurus !== null &&
            currentBalanceKurus + pendingIncomingKurus > creditUpperLimitKurus)
        ) {
          throw new SecurityError("CREDIT_LIMIT_CONFLICT", 409);
        }
        await tx
          .update(organizations)
          .set({ creditLimitKurus, creditUpperLimitKurus, updatedAt: new Date() })
          .where(eq(organizations.id, target.id));
        await tx.insert(auditLogs).values({
          actorUserId: actor.id,
          organizationId: target.id,
          action: "CREDIT_LIMITS_UPDATED",
          targetType: "organization",
          targetId: target.id,
          safeBefore: {
            creditLimitKurus: target.creditLimitKurus,
            creditUpperLimitKurus: target.creditUpperLimitKurus
          },
          safeAfter: { creditLimitKurus, creditUpperLimitKurus },
          reason: input.reason,
          correlationId: randomUUID()
        });
        const members = await tx
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, target.id));
        if (members.length) {
          await tx.insert(notifications).values(
            members.map(({ userId }) => ({
              userId,
              organizationId: target.id,
              type: "ADMIN_DECISION",
              title: "Takas kredi sınırlarınız güncellendi",
              body: `Alt sınır: -${(creditLimitKurus / 100).toLocaleString("tr-TR")} TL\nÜst sınır: ${creditUpperLimitKurus === null ? "Sınırsız" : `${(creditUpperLimitKurus / 100).toLocaleString("tr-TR")} TL`}\nBu işlem mevcut bakiyenizi değiştirmedi.\nGerekçe: ${input.reason}`
            }))
          );
        }
        continue;
      }

      const deltaKurus = Math.round(input.balanceDelta! * 100);
      const nextBalanceKurus = currentBalanceKurus + deltaKurus;
      if (
        nextBalanceKurus - heldKurus < -target.creditLimitKurus ||
        (target.creditUpperLimitKurus !== null &&
          nextBalanceKurus + pendingIncomingKurus > target.creditUpperLimitKurus)
      ) {
        throw new SecurityError("BALANCE_LIMIT_EXCEEDED", 409);
      }
      const [transaction] = await tx
        .insert(ledgerTransactions)
        .values({
          type: "ADMIN_ADJUSTMENT",
          description: "Balance adjusted by the super admin.",
          adminReason: input.reason,
          createdByUserId: actor.id
        })
        .returning({ id: ledgerTransactions.id });
      await tx.insert(ledgerEntries).values({
        transactionId: transaction.id,
        accountId: account.id,
        direction: deltaKurus > 0 ? "CREDIT" : "DEBIT",
        amountKurus: Math.abs(deltaKurus)
      });
      await tx.insert(auditLogs).values({
        actorUserId: actor.id,
        organizationId: target.id,
        action: "BALANCE_ADJUSTED",
        targetType: "ledger_account",
        targetId: account.id,
        safeBefore: { balanceKurus: currentBalanceKurus },
        safeAfter: { balanceKurus: nextBalanceKurus, deltaKurus },
        reason: input.reason,
        correlationId: randomUUID()
      });
      const members = await tx
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, target.id));
      if (members.length) {
        await tx.insert(notifications).values(
          members.map(({ userId }) => ({
            userId,
            organizationId: target.id,
            type: "ADMIN_DECISION",
            title: "Takas bakiyeniz güncellendi",
            body: `Bakiye değişikliği: ${deltaKurus > 0 ? "+" : "-"}${(Math.abs(deltaKurus) / 100).toLocaleString("tr-TR")} TL\nYeni bakiye: ${(nextBalanceKurus / 100).toLocaleString("tr-TR")} TL\nGerekçe: ${input.reason}`
          }))
        );
      }
    }
    return { count: targets.length };
  });
  return NextResponse.json(
    { ok: result.count > 0, ...result },
    { status: result.count ? 200 : 404 }
  );
}

export const POST = mutationRoute("src/app/api/admin/credit-limits", handlePost);
