import { desc, inArray, eq, or, sql } from "drizzle-orm";
import { assertAdminRead, assertOrganizationRead } from "@/lib/db/access";
import { getDb } from "@/lib/db/client";
import { orders, listings, productBatches, productCatalog } from "@/lib/db/schema";

export async function listAdminOrderQueue(page = 1) {
  await assertAdminRead();
  return getDb()
    .select({
      id: orders.id,
      status: orders.status,
      buyerOrganizationId: orders.buyerOrganizationId,
      sellerOrganizationId: orders.sellerOrganizationId,
      listingId: orders.listingId,
      quantity: orders.quantity,
      totalReferenceValueKurus: orders.totalReferenceValueKurus,
      handoverDeclaredAt: orders.handoverDeclaredAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt
    })
    .from(orders)
    .where(
      inArray(orders.status, [
        "RESERVED",
        "CONTACT_DETAILS_REVEALED",
        "SELLER_PREPARING",
        "READY_FOR_PICKUP",
        "HANDOVER_DECLARED",
        "BUYER_CONFIRMATION_PENDING",
        "DISPUTED",
        "ADMIN_FROZEN",
        "COMPLETED"
      ])
    )
    .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
    .limit(21)
    .offset((page - 1) * 20);
}

export async function listOrganizationOrders(organizationId: string, page = 1) {
  await assertOrganizationRead(organizationId);
  return getDb()
    .select({
      id: orders.id,
      status: orders.status,
      buyerOrganizationId: orders.buyerOrganizationId,
      sellerOrganizationId: orders.sellerOrganizationId,
      quantity: orders.quantity,
      total: orders.totalReferenceValueKurus,
      createdAt: orders.createdAt,
      productName: sql<string>`coalesce(${productBatches.submittedName}, ${productCatalog.name})`
    })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .where(
      or(
        eq(orders.buyerOrganizationId, organizationId),
        eq(orders.sellerOrganizationId, organizationId)
      )
    )
    .orderBy(desc(orders.createdAt), orders.id)
    .limit(21)
    .offset((page - 1) * 20);
}
