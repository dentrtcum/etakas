import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  deliveryConfirmations,
  balanceHolds,
  disputes,
  inventoryReservations,
  ledgerAccounts,
  ledgerEntries,
  ledgerTransactions,
  listings,
  orderItems,
  orders,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { assertMarketplaceVisibility } from "@/modules/marketplace/marketplace-policy";
import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";
import { assertAdminOrderDecision, type AdminOrderDecision } from "@/modules/orders/order-state";
export type { AdminOrderDecision } from "@/modules/orders/order-state";
import type { OrderCreationInput } from "@/modules/orders/order-input";

export class OrderFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderFlowError";
  }
}

type LedgerEntryRow = {
  direction: "DEBIT" | "CREDIT";
  amountKurus: number;
};

function calculateLedgerBalance(entries: LedgerEntryRow[]) {
  return entries.reduce(
    (sum, entry) =>
      entry.direction === "CREDIT" ? sum + entry.amountKurus : sum - entry.amountKurus,
    0
  );
}

export async function createOrderReservation(actor: AppSessionUser, input: OrderCreationInput) {
  const authorization = requireOrganizationAccess(actor, input.buyerOrganizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "ORDER_MANAGER"
  ]);

  if (!authorization.allowed) {
    throw new OrderFlowError(authorization.reason);
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(
        and(
          eq(orders.idempotencyKey, input.idempotencyKey),
          eq(orders.buyerOrganizationId, input.buyerOrganizationId)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [listing] = await tx
      .select({
        id: listings.id,
        sellerOrganizationId: listings.sellerOrganizationId,
        batchId: listings.batchId,
        status: listings.status,
        quantityAvailable: listings.quantityAvailable,
        unitReferenceValueKurus: listings.unitReferenceValueKurus
      })
      .from(listings)
      .where(eq(listings.id, input.listingId))
      .for("update")
      .limit(1);

    if (!listing || listing.status !== "ACTIVE") {
      throw new OrderFlowError("Listing is not active.");
    }

    if (listing.sellerOrganizationId === input.buyerOrganizationId) {
      throw new OrderFlowError("Organizations cannot order their own listings.");
    }

    if (listing.quantityAvailable < input.quantity) {
      throw new OrderFlowError("Insufficient listing stock.");
    }

    const [buyer] = await tx
      .select({
        id: organizations.id,
        type: organizations.type,
        status: organizations.status,
        creditLimitKurus: organizations.creditLimitKurus
      })
      .from(organizations)
      .where(eq(organizations.id, input.buyerOrganizationId))
      .limit(1);

    if (!buyer || buyer.status !== "APPROVED") {
      throw new OrderFlowError("Buyer organization is not approved.");
    }

    const [seller] = await tx
      .select({ id: organizations.id, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, listing.sellerOrganizationId))
      .limit(1);

    if (!seller || seller.status !== "APPROVED") {
      throw new OrderFlowError("Seller organization is not approved.");
    }

    const [batch] = await tx
      .select({
        id: productBatches.id,
        expiryDate: productBatches.expiryDate,
        productId: productBatches.productId,
        availableQuantity: productBatches.availableQuantity,
        reservedQuantity: productBatches.reservedQuantity
      })
      .from(productBatches)
      .where(eq(productBatches.id, listing.batchId))
      .for("update")
      .limit(1);

    if (!batch || batch.availableQuantity < input.quantity) {
      throw new OrderFlowError("Insufficient batch stock.");
    }

    const [product] = await tx
      .select({
        type: productCatalog.type,
        isActive: productCatalog.isActive,
        requiresColdChain: productCatalog.requiresColdChain,
        isBiological: productCatalog.isBiological,
        controlCategory: productCatalog.controlCategory
      })
      .from(productCatalog)
      .where(eq(productCatalog.id, batch.productId))
      .limit(1);

    if (!product) {
      throw new OrderFlowError("Product not found.");
    }

    if (
      new Date(`${batch.expiryDate}T23:59:59.999Z`) <= new Date() ||
      !product.isActive ||
      product.requiresColdChain ||
      product.isBiological ||
      product.controlCategory !== "STANDARD"
    )
      throw new OrderFlowError("Product is expired or unavailable.");

    assertMarketplaceVisibility({
      buyerType: buyer.type as OrganizationKind,
      productType: product.type as ProductKind
    });

    const [buyerAccount] = await tx
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.organizationId, input.buyerOrganizationId))
      .for("update")
      .limit(1);
    const [sellerAccount] = await tx
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.organizationId, listing.sellerOrganizationId))
      .limit(1);

    if (!buyerAccount || !sellerAccount) {
      throw new OrderFlowError("Ledger account is missing.");
    }

    const entries = await tx
      .select({ direction: ledgerEntries.direction, amountKurus: ledgerEntries.amountKurus })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, buyerAccount.id));
    const holds = await tx
      .select({ amountKurus: balanceHolds.amountKurus })
      .from(balanceHolds)
      .where(
        and(
          eq(balanceHolds.accountId, buyerAccount.id),
          isNull(balanceHolds.releasedAt),
          isNull(balanceHolds.consumedAt)
        )
      );

    const totalReferenceValueKurus = listing.unitReferenceValueKurus * input.quantity;
    if (
      !Number.isSafeInteger(totalReferenceValueKurus) ||
      totalReferenceValueKurus <= 0 ||
      totalReferenceValueKurus > 2147483647
    )
      throw new OrderFlowError("Order value is outside the supported range.");
    const availableBalance =
      calculateLedgerBalance(entries) -
      holds.reduce((sum, hold) => sum + hold.amountKurus, 0) +
      buyer.creditLimitKurus;

    if (availableBalance < totalReferenceValueKurus) {
      throw new OrderFlowError("Insufficient takas balance.");
    }

    const [order] = await tx
      .insert(orders)
      .values({
        buyerOrganizationId: input.buyerOrganizationId,
        sellerOrganizationId: listing.sellerOrganizationId,
        listingId: listing.id,
        status: "RESERVED",
        totalReferenceValueKurus,
        quantity: input.quantity,
        idempotencyKey: input.idempotencyKey
      })
      .returning({ id: orders.id, status: orders.status });

    if (!order) {
      throw new OrderFlowError("Order could not be created.");
    }

    await tx.insert(orderItems).values({
      orderId: order.id,
      listingId: listing.id,
      batchId: batch.id,
      quantity: input.quantity,
      unitReferenceValueKurus: listing.unitReferenceValueKurus
    });

    await tx.insert(balanceHolds).values({
      orderId: order.id,
      accountId: buyerAccount.id,
      amountKurus: totalReferenceValueKurus
    });

    await tx.insert(inventoryReservations).values({
      orderId: order.id,
      listingId: listing.id,
      batchId: batch.id,
      quantity: input.quantity
    });

    await tx
      .update(listings)
      .set({
        quantityAvailable: listing.quantityAvailable - input.quantity,
        quantityReserved: sql`${listings.quantityReserved} + ${input.quantity}`,
        status:
          listing.quantityAvailable - input.quantity === 0 ? "PARTIALLY_RESERVED" : listing.status,
        updatedAt: new Date()
      })
      .where(eq(listings.id, listing.id));

    await tx
      .update(productBatches)
      .set({
        availableQuantity: batch.availableQuantity - input.quantity,
        reservedQuantity: batch.reservedQuantity + input.quantity,
        updatedAt: new Date()
      })
      .where(eq(productBatches.id, batch.id));

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: input.buyerOrganizationId,
      action: "ORDER_RESERVED",
      targetType: "order",
      targetId: order.id,
      safeBefore: null,
      safeAfter: { listingId: listing.id, quantity: input.quantity, totalReferenceValueKurus },
      correlationId: randomUUID(),
      reason: "Order reserved balance and stock atomically."
    });

    return order;
  });
}

export async function markSellerHandover(actor: AppSessionUser, orderId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        sellerOrganizationId: orders.sellerOrganizationId,
        status: orders.status
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) throw new OrderFlowError("Order not found.");
    const authorization = requireOrganizationAccess(actor, order.sellerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]);
    if (!authorization.allowed) throw new OrderFlowError(authorization.reason);
    if (
      !["RESERVED", "CONTACT_DETAILS_REVEALED", "SELLER_PREPARING", "READY_FOR_PICKUP"].includes(
        order.status
      )
    ) {
      throw new OrderFlowError("Order cannot be handed over from current status.");
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: "BUYER_CONFIRMATION_PENDING",
        handoverDeclaredAt: new Date(),
        autoCompleteAfter: null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id, status: orders.status });

    await tx
      .insert(deliveryConfirmations)
      .values({ orderId, actorUserId: actor.id, kind: "SELLER_HANDOVER" });
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: order.sellerOrganizationId,
      action: "ORDER_HANDOVER_DECLARED",
      targetType: "order",
      targetId: orderId,
      safeBefore: { status: order.status },
      safeAfter: { status: "BUYER_CONFIRMATION_PENDING" },
      correlationId: randomUUID()
    });
    return updated;
  });
}

export async function confirmBuyerDelivery(actor: AppSessionUser, orderId: string) {
  const db = getDb();
  const [order] = await db
    .select({
      id: orders.id,
      buyerOrganizationId: orders.buyerOrganizationId,
      status: orders.status
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new OrderFlowError("Order not found.");

  const authorization = requireOrganizationAccess(actor, order.buyerOrganizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "ORDER_MANAGER"
  ]);

  if (!authorization.allowed) throw new OrderFlowError(authorization.reason);
  if (order.status !== "BUYER_CONFIRMATION_PENDING") {
    throw new OrderFlowError("Buyer can only confirm after seller delivery declaration.");
  }

  return completeOrder(orderId, actor.id, "BUYER_CONFIRMATION_PENDING");
}

export async function openOrderDispute(actor: AppSessionUser, orderId: string, reason: string) {
  if (reason.trim().length < 10) {
    throw new OrderFlowError("Dispute reason must be at least 10 characters.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        buyerOrganizationId: orders.buyerOrganizationId,
        sellerOrganizationId: orders.sellerOrganizationId,
        status: orders.status
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) throw new OrderFlowError("Order not found.");

    const isBuyer = actor.organizationIds.includes(order.buyerOrganizationId);
    const isSeller = actor.organizationIds.includes(order.sellerOrganizationId);
    if (!isBuyer && !isSeller) {
      throw new OrderFlowError("Only order parties can open disputes.");
    }

    if (["CANCELLED", "EXPIRED", "COMPLETED", "DISPUTED", "ADMIN_FROZEN"].includes(order.status)) {
      throw new OrderFlowError("Order cannot be disputed from current status.");
    }

    await tx
      .update(orders)
      .set({ status: "DISPUTED", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx.insert(disputes).values({
      orderId,
      openedByUserId: actor.id,
      status: "OPEN",
      reason
    });

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: isBuyer ? order.buyerOrganizationId : order.sellerOrganizationId,
      action: "ORDER_DISPUTE_OPENED",
      targetType: "order",
      targetId: orderId,
      safeBefore: { status: order.status },
      safeAfter: { status: "DISPUTED" },
      correlationId: randomUUID(),
      reason
    });

    return { id: orderId, status: "DISPUTED" as const };
  });
}

export async function cancelOrderReservation(actor: AppSessionUser, orderId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        buyerOrganizationId: orders.buyerOrganizationId,
        sellerOrganizationId: orders.sellerOrganizationId,
        listingId: orders.listingId,
        quantity: orders.quantity,
        status: orders.status
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) throw new OrderFlowError("Order not found.");
    const authorization = requireOrganizationAccess(actor, order.buyerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]);
    if (!authorization.allowed) throw new OrderFlowError(authorization.reason);
    if (
      !["RESERVED", "CONTACT_DETAILS_REVEALED", "SELLER_PREPARING", "READY_FOR_PICKUP"].includes(
        order.status
      )
    ) {
      throw new OrderFlowError("Order cannot be cancelled from current status.");
    }

    const [reservation] = await tx
      .select({ id: inventoryReservations.id, batchId: inventoryReservations.batchId })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          isNull(inventoryReservations.releasedAt),
          isNull(inventoryReservations.consumedAt)
        )
      )
      .limit(1);

    await tx
      .update(balanceHolds)
      .set({ releasedAt: new Date() })
      .where(
        and(
          eq(balanceHolds.orderId, orderId),
          isNull(balanceHolds.releasedAt),
          isNull(balanceHolds.consumedAt)
        )
      );

    if (reservation) {
      await tx
        .update(inventoryReservations)
        .set({ releasedAt: new Date() })
        .where(eq(inventoryReservations.id, reservation.id));
      await tx
        .update(productBatches)
        .set({
          availableQuantity: sql`${productBatches.availableQuantity} + ${order.quantity}`,
          reservedQuantity: sql`${productBatches.reservedQuantity} - ${order.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(productBatches.id, reservation.batchId));
    }

    await tx
      .update(listings)
      .set({
        quantityAvailable: sql`${listings.quantityAvailable} + ${order.quantity}`,
        quantityReserved: sql`${listings.quantityReserved} - ${order.quantity}`,
        status: "ACTIVE",
        updatedAt: new Date()
      })
      .where(eq(listings.id, order.listingId));

    const [updated] = await tx
      .update(orders)
      .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id, status: orders.status });

    return updated;
  });
}

type OrderTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function completeOrder(
  orderId: string,
  actorUserId: string | null = null,
  expectedStatus?: string
) {
  return getDb().transaction((tx) =>
    completeOrderInTransaction(tx, orderId, actorUserId, expectedStatus)
  );
}
async function completeOrderInTransaction(
  tx: OrderTransaction,
  orderId: string,
  actorUserId: string | null,
  expectedStatus?: string
) {
  const [order] = await tx
    .select({
      id: orders.id,
      buyerOrganizationId: orders.buyerOrganizationId,
      sellerOrganizationId: orders.sellerOrganizationId,
      listingId: orders.listingId,
      quantity: orders.quantity,
      status: orders.status,
      totalReferenceValueKurus: orders.totalReferenceValueKurus
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .for("update")
    .limit(1);

  if (!order) throw new OrderFlowError("Order not found.");
  if (order.status === "COMPLETED") return { id: order.id, status: order.status };
  if (expectedStatus && order.status !== expectedStatus)
    throw new OrderFlowError("Order cannot be completed from current status.");
  if (
    !["BUYER_CONFIRMATION_PENDING", "HANDOVER_DECLARED", "DISPUTED", "ADMIN_FROZEN"].includes(
      order.status
    )
  ) {
    throw new OrderFlowError("Order cannot be completed from current status.");
  }

  const [buyerAccount] = await tx
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.organizationId, order.buyerOrganizationId))
    .limit(1);
  const [sellerAccount] = await tx
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.organizationId, order.sellerOrganizationId))
    .limit(1);

  if (!buyerAccount || !sellerAccount) {
    throw new OrderFlowError("Ledger account is missing.");
  }

  const [reservation] = await tx
    .select({ id: inventoryReservations.id, batchId: inventoryReservations.batchId })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, order.id),
        isNull(inventoryReservations.consumedAt),
        isNull(inventoryReservations.releasedAt)
      )
    )
    .limit(1);

  if (!reservation) {
    throw new OrderFlowError("Inventory reservation is missing.");
  }

  const [currentListing] = await tx
    .select({
      quantityAvailable: listings.quantityAvailable,
      quantityReserved: listings.quantityReserved
    })
    .from(listings)
    .where(eq(listings.id, order.listingId))
    .for("update")
    .limit(1);

  if (!currentListing) {
    throw new OrderFlowError("Listing is missing.");
  }

  const nextListingStatus =
    currentListing.quantityAvailable === 0 && currentListing.quantityReserved - order.quantity === 0
      ? "SOLD_OUT"
      : "ACTIVE";

  const [ledgerTransaction] = await tx
    .insert(ledgerTransactions)
    .values({
      type: "ORDER_COMPLETION",
      description: "Order completed and reserved balance converted to ledger movement.",
      orderId: order.id,
      createdByUserId: actorUserId
    })
    .returning({ id: ledgerTransactions.id });

  await tx.insert(ledgerEntries).values([
    {
      transactionId: ledgerTransaction.id,
      accountId: buyerAccount.id,
      direction: "DEBIT",
      amountKurus: order.totalReferenceValueKurus
    },
    {
      transactionId: ledgerTransaction.id,
      accountId: sellerAccount.id,
      direction: "CREDIT",
      amountKurus: order.totalReferenceValueKurus
    }
  ]);

  await tx
    .update(balanceHolds)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(balanceHolds.orderId, order.id),
        isNull(balanceHolds.consumedAt),
        isNull(balanceHolds.releasedAt)
      )
    );
  await tx
    .update(inventoryReservations)
    .set({ consumedAt: new Date() })
    .where(eq(inventoryReservations.id, reservation.id));
  await tx
    .update(productBatches)
    .set({
      reservedQuantity: sql`${productBatches.reservedQuantity} - ${order.quantity}`,
      transferredQuantity: sql`${productBatches.transferredQuantity} + ${order.quantity}`,
      updatedAt: new Date()
    })
    .where(eq(productBatches.id, reservation.batchId));
  await tx
    .update(listings)
    .set({
      quantityReserved: sql`${listings.quantityReserved} - ${order.quantity}`,
      status: nextListingStatus,
      updatedAt: new Date()
    })
    .where(eq(listings.id, order.listingId));

  const [updated] = await tx
    .update(orders)
    .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning({ id: orders.id, status: orders.status });

  await tx.insert(auditLogs).values({
    actorUserId,
    organizationId: order.buyerOrganizationId,
    action: "ORDER_COMPLETED",
    targetType: "order",
    targetId: order.id,
    safeBefore: { status: order.status },
    safeAfter: { status: "COMPLETED" },
    correlationId: randomUUID(),
    reason: "Order completed and ledger entries posted."
  });

  if (expectedStatus && actorUserId)
    await tx.insert(deliveryConfirmations).values({ orderId, actorUserId, kind: "BUYER_RECEIVED" });
  return updated;
}

async function releaseReservedOrder(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  order: {
    id: string;
    listingId: string;
    quantity: number;
  }
) {
  const [reservation] = await tx
    .select({ id: inventoryReservations.id, batchId: inventoryReservations.batchId })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, order.id),
        isNull(inventoryReservations.releasedAt),
        isNull(inventoryReservations.consumedAt)
      )
    )
    .limit(1);

  await tx
    .update(balanceHolds)
    .set({ releasedAt: new Date() })
    .where(
      and(
        eq(balanceHolds.orderId, order.id),
        isNull(balanceHolds.releasedAt),
        isNull(balanceHolds.consumedAt)
      )
    );

  if (reservation) {
    await tx
      .update(inventoryReservations)
      .set({ releasedAt: new Date() })
      .where(eq(inventoryReservations.id, reservation.id));
    await tx
      .update(productBatches)
      .set({
        availableQuantity: sql`${productBatches.availableQuantity} + ${order.quantity}`,
        reservedQuantity: sql`${productBatches.reservedQuantity} - ${order.quantity}`,
        updatedAt: new Date()
      })
      .where(eq(productBatches.id, reservation.batchId));
  }

  await tx
    .update(listings)
    .set({
      quantityAvailable: sql`${listings.quantityAvailable} + ${order.quantity}`,
      quantityReserved: sql`${listings.quantityReserved} - ${order.quantity}`,
      status: "ACTIVE",
      updatedAt: new Date()
    })
    .where(eq(listings.id, order.listingId));
}

export async function adminResolveOrder({
  actor,
  orderId,
  decision,
  reason
}: {
  actor: AppSessionUser;
  orderId: string;
  decision: AdminOrderDecision;
  reason: string;
}) {
  if (reason.trim().length < 10) {
    throw new OrderFlowError("Admin order decision reason must be at least 10 characters.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        buyerOrganizationId: orders.buyerOrganizationId,
        sellerOrganizationId: orders.sellerOrganizationId,
        listingId: orders.listingId,
        quantity: orders.quantity,
        status: orders.status,
        totalReferenceValueKurus: orders.totalReferenceValueKurus
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) throw new OrderFlowError("Order not found.");

    try {
      assertAdminOrderDecision(order.status, decision);
    } catch {
      throw new OrderFlowError("Order action is not allowed from current status.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: order.buyerOrganizationId,
      action: `ADMIN_ORDER_${decision}`,
      targetType: "order",
      targetId: orderId,
      safeBefore: { status: order.status },
      correlationId: randomUUID(),
      reason
    });
    if (decision === "FREEZE") {
      const [updated] = await tx
        .update(orders)
        .set({ status: "ADMIN_FROZEN", updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning({ id: orders.id, status: orders.status });
      return updated;
    }

    if (decision === "FORCE_COMPLETE") {
      return completeOrderInTransaction(tx, orderId, actor.id);
    }

    if (decision === "CANCEL") {
      if (order.status === "COMPLETED") {
        throw new OrderFlowError("Completed order requires REFUND_COMPLETED.");
      }
      await releaseReservedOrder(tx, order);
      const [updated] = await tx
        .update(orders)
        .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning({ id: orders.id, status: orders.status });
      return updated;
    }

    if (decision === "REFUND_COMPLETED") {
      if (order.status !== "COMPLETED") {
        throw new OrderFlowError("Only completed orders can be refunded.");
      }

      const [buyerAccount] = await tx
        .select({ id: ledgerAccounts.id })
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.organizationId, order.buyerOrganizationId))
        .limit(1);
      const [sellerAccount] = await tx
        .select({ id: ledgerAccounts.id })
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.organizationId, order.sellerOrganizationId))
        .limit(1);

      if (!buyerAccount || !sellerAccount) {
        throw new OrderFlowError("Ledger account is missing.");
      }

      const [ledgerTransaction] = await tx
        .insert(ledgerTransactions)
        .values({
          type: "REVERSAL",
          description: "Admin approved return/refund reversal.",
          adminReason: reason,
          orderId,
          createdByUserId: actor.id
        })
        .returning({ id: ledgerTransactions.id });

      await tx.insert(ledgerEntries).values([
        {
          transactionId: ledgerTransaction.id,
          accountId: buyerAccount.id,
          direction: "CREDIT",
          amountKurus: order.totalReferenceValueKurus
        },
        {
          transactionId: ledgerTransaction.id,
          accountId: sellerAccount.id,
          direction: "DEBIT",
          amountKurus: order.totalReferenceValueKurus
        }
      ]);

      const [reservation] = await tx
        .select({ batchId: inventoryReservations.batchId })
        .from(inventoryReservations)
        .where(eq(inventoryReservations.orderId, orderId))
        .limit(1);

      if (reservation) {
        await tx
          .update(productBatches)
          .set({
            availableQuantity: sql`${productBatches.availableQuantity} + ${order.quantity}`,
            transferredQuantity: sql`${productBatches.transferredQuantity} - ${order.quantity}`,
            updatedAt: new Date()
          })
          .where(eq(productBatches.id, reservation.batchId));
        await tx
          .update(listings)
          .set({
            quantityAvailable: sql`${listings.quantityAvailable} + ${order.quantity}`,
            status: "ACTIVE",
            updatedAt: new Date()
          })
          .where(eq(listings.id, order.listingId));
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning({ id: orders.id, status: orders.status });
      return updated;
    }

    throw new OrderFlowError("Unknown admin order decision.");
  });
}
