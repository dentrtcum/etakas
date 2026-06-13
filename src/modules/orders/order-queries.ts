import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

export async function listAdminOrderQueue() {
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
    .where(inArray(orders.status, ["BUYER_CONFIRMATION_PENDING", "DISPUTED", "ADMIN_FROZEN", "COMPLETED"]))
    .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
    .limit(50);
}
