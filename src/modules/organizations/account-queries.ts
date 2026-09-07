import { and, eq, inArray, isNull, sql, desc, or, count } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
  organizations,
  organizationAddresses,
  organizationDocuments,
  listings,
  orders,
  ledgerAccounts,
  ledgerEntries,
  balanceHolds,
  productBatches,
  productCatalog,
  ledgerTransactions
} from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { cache } from "react";
import { decryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
export const getAccountContext = cache(async () => {
  const actor = await getCurrentAppUser();
  if (!actor) redirect("/giris?next=/panel");
  const organization = actor.organizationIds.length
    ? (
        await getDb()
          .select()
          .from(organizations)
          .where(inArray(organizations.id, actor.organizationIds))
          .orderBy(desc(organizations.approvedAt), organizations.createdAt)
          .limit(1)
      )[0]
    : null;
  return { actor, organization };
});
export async function getAccountOverview(organizationId: string) {
  const db = getDb();
  const [account] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.organizationId, organizationId))
    .limit(1);
  const [[listingCount], [orderCount], balance, held] = await Promise.all([
    db
      .select({ value: count() })
      .from(listings)
      .where(eq(listings.sellerOrganizationId, organizationId)),
    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          or(
            eq(orders.buyerOrganizationId, organizationId),
            eq(orders.sellerOrganizationId, organizationId)
          ),
          inArray(orders.status, [
            "RESERVED",
            "BUYER_CONFIRMATION_PENDING",
            "DISPUTED",
            "ADMIN_FROZEN"
          ])
        )
      ),
    account
      ? db
          .select({
            value: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'CREDIT' then ${ledgerEntries.amountKurus} else -${ledgerEntries.amountKurus} end),0)::bigint`
          })
          .from(ledgerEntries)
          .where(eq(ledgerEntries.accountId, account.id))
      : Promise.resolve([{ value: 0 }]),
    account
      ? db
          .select({ value: sql<number>`coalesce(sum(${balanceHolds.amountKurus}),0)::bigint` })
          .from(balanceHolds)
          .where(
            and(
              eq(balanceHolds.accountId, account.id),
              isNull(balanceHolds.releasedAt),
              isNull(balanceHolds.consumedAt)
            )
          )
      : Promise.resolve([{ value: 0 }])
  ]);
  return {
    listingCount: listingCount.value,
    orderCount: orderCount.value,
    balance: Number(balance[0].value),
    held: Number(held[0].value),
    accountId: account?.id
  };
}
export async function getOwnListings(organizationId: string, page = 1) {
  return getDb()
    .select({
      id: listings.id,
      status: listings.status,
      productName: productCatalog.name,
      barcode: productCatalog.gtin,
      quantity: listings.quantityAvailable,
      reserved: listings.quantityReserved,
      expiry: productBatches.expiryDate,
      value: listings.unitReferenceValueKurus,
      note: listings.adminReviewNote
    })
    .from(listings)
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .where(eq(listings.sellerOrganizationId, organizationId))
    .orderBy(desc(listings.createdAt), listings.id)
    .limit(21)
    .offset((page - 1) * 20);
}
export async function getOrganizationDetails(organizationId: string) {
  const db = getDb();
  const [addresses, documents] = await Promise.all([
    db
      .select()
      .from(organizationAddresses)
      .where(eq(organizationAddresses.organizationId, organizationId))
      .limit(1),
    db
      .select({
        id: organizationDocuments.id,
        kind: organizationDocuments.kind,
        status: organizationDocuments.scanStatus
      })
      .from(organizationDocuments)
      .where(eq(organizationDocuments.organizationId, organizationId))
  ]);
  return {
    address:
      addresses[0] && serverEnv.ENCRYPTION_KEY
        ? decryptField(addresses[0].addressEncrypted, serverEnv.ENCRYPTION_KEY)
        : "",
    documents
  };
}
export async function getLedgerHistory(accountId: string, page = 1) {
  return getDb()
    .select({
      id: ledgerEntries.id,
      direction: ledgerEntries.direction,
      amount: ledgerEntries.amountKurus,
      type: ledgerTransactions.type,
      createdAt: ledgerEntries.createdAt
    })
    .from(ledgerEntries)
    .innerJoin(ledgerTransactions, eq(ledgerTransactions.id, ledgerEntries.transactionId))
    .where(eq(ledgerEntries.accountId, accountId))
    .orderBy(desc(ledgerEntries.createdAt), ledgerEntries.id)
    .limit(21)
    .offset((page - 1) * 20);
}
export function readPage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1;
}
