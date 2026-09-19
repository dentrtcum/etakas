import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { requireAdmin, requireOrganizationAccess } from "@/lib/auth/authorization";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
import { exceedsUpperCreditLimit } from "@/modules/ledger/credit-limits";
import { assertLiveTradingEnabled } from "@/modules/compliance/live-trading";
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
  notifications,
  organizationMembers,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { assertMarketplaceVisibility } from "@/modules/marketplace/marketplace-policy";
import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";
import { assertAdminOrderDecision, type AdminOrderDecision } from "@/modules/orders/order-state";
import { OPEN_ORDER_STATUSES } from "@/modules/orders/open-statuses";
export type { AdminOrderDecision } from "@/modules/orders/order-state";
import {
  orderActionSchema,
  orderCreationSchema,
  type OrderCreationInput
} from "@/modules/orders/order-input";

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
  input = orderCreationSchema.parse(input);
  assertLiveTradingEnabled();
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
    await lockAccounting(tx);
    const [existing] = await tx
      .select({
        id: orders.id,
        status: orders.status,
        listingId: orders.listingId,
        quantity: orders.quantity
      })
      .from(orders)
      .where(
        and(
          eq(orders.idempotencyKey, input.idempotencyKey),
          eq(orders.buyerOrganizationId, input.buyerOrganizationId)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.listingId !== input.listingId || existing.quantity !== input.quantity)
        throw new OrderFlowError("Idempotency key was used for a different request.");
      return { id: existing.id, status: existing.status };
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

    if (!listing || !["ACTIVE", "PARTIALLY_RESERVED"].includes(listing.status)) {
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
      .select({
        id: organizations.id,
        status: organizations.status,
        type: organizations.type,
        creditUpperLimitKurus: organizations.creditUpperLimitKurus
      })
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
      (seller.type !== "PHARMACY" && product.type === "HUMAN") ||
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
    if (typeof seller.creditUpperLimitKurus === "number") {
      const sellerEntries = await tx
        .select({ direction: ledgerEntries.direction, amountKurus: ledgerEntries.amountKurus })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.accountId, sellerAccount.id));
      const [pendingSellerCredits] = await tx
        .select({
          value: sql<number>`coalesce(sum(${orders.totalReferenceValueKurus}), 0)::bigint`
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerOrganizationId, listing.sellerOrganizationId),
            inArray(orders.status, [...OPEN_ORDER_STATUSES])
          )
        );
      if (
        exceedsUpperCreditLimit(
          calculateLedgerBalance(sellerEntries),
          Number(pendingSellerCredits.value) + totalReferenceValueKurus,
          seller.creditUpperLimitKurus
        )
      ) {
        throw new OrderFlowError("Seller upper credit limit would be exceeded.");
      }
    }
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
        status: "PARTIALLY_RESERVED",
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

    await notifyOrganization(
      tx,
      listing.sellerOrganizationId,
      "ORDER_RECEIVED",
      "Yeni sipariş aldınız",
      `${order.id.slice(0, 8)} numaralı siparişte ${input.quantity} adet ürün rezerve edildi. Ayrıntıları Siparişlerim bölümünden inceleyin.`
    );

    return order;
  });
}

export async function markSellerHandover(actor: AppSessionUser, orderId: string) {
  orderId = orderActionSchema.parse({ orderId }).orderId;
  assertLiveTradingEnabled();
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockAccounting(tx);
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
    const authorization = requireOrganizationAccess(actor, order.sellerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]);
    if (!authorization.allowed) throw new OrderFlowError(authorization.reason);
    await assertApprovedOrderParties(tx, order);
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
    await notifyOrganization(
      tx,
      order.buyerOrganizationId,
      "ORDER_HANDOVER",
      "Satıcı teslim bilgisini iletti",
      `${order.id.slice(0, 8)} numaralı sipariş için satıcı teslim bildirimi yaptı. Ürünü teslim aldıktan sonra Siparişlerim bölümünden onaylayın.`
    );
    return updated;
  });
}

export async function confirmBuyerDelivery(actor: AppSessionUser, orderId: string) {
  orderId = orderActionSchema.parse({ orderId }).orderId;
  assertLiveTradingEnabled();
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

  return getDb().transaction(async (tx) => {
    await lockAccounting(tx);
    return completeOrderInTransaction(tx, orderId, actor.id, "BUYER_CONFIRMATION_PENDING", true);
  });
}

export async function openOrderDispute(actor: AppSessionUser, orderId: string, reason: string) {
  orderId = orderActionSchema.parse({ orderId }).orderId;
  reason = reason.trim();
  if (reason.length < 10 || reason.length > 2000) {
    throw new OrderFlowError("Dispute reason must contain 10 to 2000 characters.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    await lockAccounting(tx);
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

    const isBuyer = requireOrganizationAccess(actor, order.buyerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]).allowed;
    const isSeller = requireOrganizationAccess(actor, order.sellerOrganizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "ORDER_MANAGER"
    ]).allowed;
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
  orderId = orderActionSchema.parse({ orderId }).orderId;
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockAccounting(tx);
    const [order] = await tx
      .select({
        id: orders.id,
        buyerOrganizationId: orders.buyerOrganizationId,
        sellerOrganizationId: orders.sellerOrganizationId,
        listingId: orders.listingId,
        quantity: orders.quantity,
        totalReferenceValueKurus: orders.totalReferenceValueKurus,
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

    await releaseReservedOrder(tx, order);

    const [updated] = await tx
      .update(orders)
      .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id, status: orders.status });

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: order.buyerOrganizationId,
      action: "ORDER_CANCELLED",
      targetType: "order",
      targetId: orderId,
      safeBefore: { status: order.status },
      safeAfter: { status: "CANCELLED" },
      correlationId: randomUUID(),
      reason: "Buyer cancelled the reservation; held balance and stock released."
    });
    return updated;
  });
}

type OrderTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function notifyOrganization(
  tx: OrderTransaction,
  organizationId: string,
  type: string,
  title: string,
  body: string
) {
  const recipients = await tx
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
  if (!recipients.length) return;
  await tx.insert(notifications).values(
    [...new Set(recipients.map((recipient) => recipient.userId))].map((userId) => ({
      userId,
      organizationId,
      type,
      title,
      body
    }))
  );
}

async function completeOrderInTransaction(
  tx: OrderTransaction,
  orderId: string,
  actorUserId: string | null,
  expectedStatus?: string,
  requireApprovedParties = false
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

  if (requireApprovedParties) await assertApprovedOrderParties(tx, order);
  const { reservation, hold, currentListing } = await loadReservedOrderState(tx, order);

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
  const [buyerLimits] = await tx
    .select({ creditLimitKurus: organizations.creditLimitKurus })
    .from(organizations)
    .where(eq(organizations.id, order.buyerOrganizationId))
    .limit(1);
  const [sellerLimits] = await tx
    .select({ creditUpperLimitKurus: organizations.creditUpperLimitKurus })
    .from(organizations)
    .where(eq(organizations.id, order.sellerOrganizationId))
    .limit(1);
  if (buyerLimits) {
    const buyerEntries = await tx
      .select({ direction: ledgerEntries.direction, amountKurus: ledgerEntries.amountKurus })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, buyerAccount.id));
    const buyerHolds = await tx
      .select({ amountKurus: balanceHolds.amountKurus })
      .from(balanceHolds)
      .where(
        and(
          eq(balanceHolds.accountId, buyerAccount.id),
          isNull(balanceHolds.releasedAt),
          isNull(balanceHolds.consumedAt)
        )
      );
    const balanceAfterOpenPurchases =
      calculateLedgerBalance(buyerEntries) -
      buyerHolds.reduce((sum, item) => sum + item.amountKurus, 0);
    if (balanceAfterOpenPurchases < -buyerLimits.creditLimitKurus) {
      throw new OrderFlowError("Buyer lower credit limit would be exceeded.");
    }
  }
  if (
    sellerLimits?.creditUpperLimitKurus !== null &&
    sellerLimits?.creditUpperLimitKurus !== undefined
  ) {
    const sellerEntries = await tx
      .select({ direction: ledgerEntries.direction, amountKurus: ledgerEntries.amountKurus })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, sellerAccount.id));
    const [pendingSellerCredits] = await tx
      .select({ value: sql<number>`coalesce(sum(${orders.totalReferenceValueKurus}), 0)::bigint` })
      .from(orders)
      .where(
        and(
          eq(orders.sellerOrganizationId, order.sellerOrganizationId),
          inArray(orders.status, [...OPEN_ORDER_STATUSES])
        )
      );
    if (
      exceedsUpperCreditLimit(
        calculateLedgerBalance(sellerEntries),
        Number(pendingSellerCredits.value),
        sellerLimits.creditUpperLimitKurus
      )
    ) {
      throw new OrderFlowError("Seller upper credit limit would be exceeded.");
    }
  }

  const nextListingStatus = !["ACTIVE", "PARTIALLY_RESERVED", "SOLD_OUT"].includes(
    currentListing.status
  )
    ? currentListing.status
    : currentListing.quantityAvailable === 0 &&
        currentListing.quantityReserved - order.quantity === 0
      ? "SOLD_OUT"
      : currentListing.quantityReserved - order.quantity > 0
        ? "PARTIALLY_RESERVED"
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

  await tx.update(balanceHolds).set({ consumedAt: new Date() }).where(eq(balanceHolds.id, hold.id));
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
  await notifyOrganization(
    tx,
    order.sellerOrganizationId,
    "ORDER_COMPLETED",
    "Teslim alındı ve sipariş tamamlandı",
    `${order.id.slice(0, 8)} numaralı siparişin teslimi alıcı tarafından onaylandı. Takas bakiyesi hesaplara işlendi.`
  );
  return updated;
}

type ReservedOrder = {
  id: string;
  listingId: string;
  buyerOrganizationId: string;
  sellerOrganizationId: string;
  quantity: number;
  totalReferenceValueKurus: number;
};

async function assertApprovedOrderParties(
  tx: OrderTransaction,
  order: { buyerOrganizationId: string; sellerOrganizationId: string }
) {
  for (const organizationId of [order.buyerOrganizationId, order.sellerOrganizationId]) {
    const [organization] = await tx
      .select({ status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (organization?.status !== "APPROVED")
      throw new OrderFlowError("Both order parties must remain approved.");
  }
}

// Fail closed on missing, duplicated or inconsistent reservations. Releasing stock or
// posting ledger entries must never silently repair an inconsistent accounting record.
async function loadReservedOrderState(tx: OrderTransaction, order: ReservedOrder) {
  const reservations = await tx
    .select({
      id: inventoryReservations.id,
      batchId: inventoryReservations.batchId,
      listingId: inventoryReservations.listingId,
      quantity: inventoryReservations.quantity
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, order.id),
        isNull(inventoryReservations.releasedAt),
        isNull(inventoryReservations.consumedAt)
      )
    )
    .for("update")
    .limit(2);
  const reservation = reservations[0];
  if (
    reservations.length !== 1 ||
    reservation.quantity !== order.quantity ||
    reservation.listingId !== order.listingId
  )
    throw new OrderFlowError("Inventory reservation is missing or inconsistent.");

  const holds = await tx
    .select({
      id: balanceHolds.id,
      amountKurus: balanceHolds.amountKurus,
      organizationId: ledgerAccounts.organizationId
    })
    .from(balanceHolds)
    .innerJoin(ledgerAccounts, eq(balanceHolds.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(balanceHolds.orderId, order.id),
        isNull(balanceHolds.releasedAt),
        isNull(balanceHolds.consumedAt)
      )
    )
    .for("update")
    .limit(2);
  const hold = holds[0];
  if (
    holds.length !== 1 ||
    hold.amountKurus !== order.totalReferenceValueKurus ||
    hold.organizationId !== order.buyerOrganizationId
  )
    throw new OrderFlowError("Balance hold is missing or inconsistent.");

  const [currentListing] = await tx
    .select({
      batchId: listings.batchId,
      sellerOrganizationId: listings.sellerOrganizationId,
      status: listings.status,
      quantityAvailable: listings.quantityAvailable,
      quantityReserved: listings.quantityReserved
    })
    .from(listings)
    .where(eq(listings.id, order.listingId))
    .for("update")
    .limit(1);
  const [batch] = await tx
    .select({
      organizationId: productBatches.organizationId,
      reservedQuantity: productBatches.reservedQuantity
    })
    .from(productBatches)
    .where(eq(productBatches.id, reservation.batchId))
    .for("update")
    .limit(1);
  if (
    !currentListing ||
    currentListing.batchId !== reservation.batchId ||
    currentListing.sellerOrganizationId !== order.sellerOrganizationId ||
    currentListing.quantityReserved < order.quantity ||
    !batch ||
    batch.organizationId !== order.sellerOrganizationId ||
    batch.reservedQuantity < order.quantity
  )
    throw new OrderFlowError("Reserved stock is missing or inconsistent.");
  return { reservation, hold, currentListing };
}

async function releaseReservedOrder(tx: OrderTransaction, order: ReservedOrder) {
  const { reservation, hold } = await loadReservedOrderState(tx, order);
  await tx.update(balanceHolds).set({ releasedAt: new Date() }).where(eq(balanceHolds.id, hold.id));
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
  await tx
    .update(listings)
    .set({
      quantityAvailable: sql`${listings.quantityAvailable} + ${order.quantity}`,
      quantityReserved: sql`${listings.quantityReserved} - ${order.quantity}`,
      status: sql`case when ${listings.status} in ('ACTIVE', 'PARTIALLY_RESERVED', 'SOLD_OUT') then case when ${listings.quantityReserved} - ${order.quantity} > 0 then 'PARTIALLY_RESERVED'::listing_status else 'ACTIVE'::listing_status end else ${listings.status} end`,
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
  if (!requireAdmin(actor).allowed) throw new OrderFlowError("FORBIDDEN");
  orderId = orderActionSchema.parse({ orderId }).orderId;
  reason = reason.trim();
  if (decision === "FORCE_COMPLETE") assertLiveTradingEnabled();
  if (reason.trim().length < 10 || reason.length > 2000) {
    throw new OrderFlowError("Admin order decision reason must be at least 10 characters.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    await lockAccounting(tx);
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
    const affectedMembers = await tx
      .select({
        userId: organizationMembers.userId,
        organizationId: organizationMembers.organizationId
      })
      .from(organizationMembers)
      .where(
        inArray(organizationMembers.organizationId, [
          order.buyerOrganizationId,
          order.sellerOrganizationId
        ])
      );
    if (affectedMembers.length) {
      await tx.insert(notifications).values(
        affectedMembers.map(({ userId, organizationId }) => ({
          userId,
          organizationId,
          type: "ADMIN_DECISION",
          title: `Sipariş için yönetici kararı: ${decision}`,
          body: `Sipariş: ${order.id.slice(0, 8)}\nGerekçe: ${reason}`
        }))
      );
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

      const reservations = await tx
        .select({
          id: inventoryReservations.id,
          batchId: inventoryReservations.batchId,
          listingId: inventoryReservations.listingId,
          quantity: inventoryReservations.quantity
        })
        .from(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.orderId, orderId),
            isNotNull(inventoryReservations.consumedAt),
            isNull(inventoryReservations.releasedAt)
          )
        )
        .for("update")
        .limit(2);
      const reservation = reservations[0];
      if (
        reservations.length !== 1 ||
        reservation.listingId !== order.listingId ||
        reservation.quantity !== order.quantity
      )
        throw new OrderFlowError("Consumed inventory reservation is missing or inconsistent.");
      const [batch] = await tx
        .select({
          organizationId: productBatches.organizationId,
          transferredQuantity: productBatches.transferredQuantity
        })
        .from(productBatches)
        .where(eq(productBatches.id, reservation.batchId))
        .for("update")
        .limit(1);
      const [listing] = await tx
        .select({ batchId: listings.batchId, sellerOrganizationId: listings.sellerOrganizationId })
        .from(listings)
        .where(eq(listings.id, order.listingId))
        .for("update")
        .limit(1);
      if (
        !batch ||
        batch.organizationId !== order.sellerOrganizationId ||
        batch.transferredQuantity < order.quantity ||
        !listing ||
        listing.batchId !== reservation.batchId ||
        listing.sellerOrganizationId !== order.sellerOrganizationId
      )
        throw new OrderFlowError("Transferred stock is missing or inconsistent.");
      const completions = await tx
        .select({ id: ledgerTransactions.id })
        .from(ledgerTransactions)
        .where(
          and(
            eq(ledgerTransactions.orderId, orderId),
            eq(ledgerTransactions.type, "ORDER_COMPLETION")
          )
        )
        .limit(2);
      if (completions.length !== 1)
        throw new OrderFlowError("Completed ledger transaction is missing or inconsistent.");
      const originalEntries = await tx
        .select({
          accountId: ledgerEntries.accountId,
          direction: ledgerEntries.direction,
          amountKurus: ledgerEntries.amountKurus
        })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, completions[0].id))
        .limit(3);
      if (
        originalEntries.length !== 2 ||
        !originalEntries.some(
          (entry) =>
            entry.accountId === buyerAccount.id &&
            entry.direction === "DEBIT" &&
            entry.amountKurus === order.totalReferenceValueKurus
        ) ||
        !originalEntries.some(
          (entry) =>
            entry.accountId === sellerAccount.id &&
            entry.direction === "CREDIT" &&
            entry.amountKurus === order.totalReferenceValueKurus
        )
      )
        throw new OrderFlowError("Completed ledger entries are inconsistent.");

      const [ledgerTransaction] = await tx
        .insert(ledgerTransactions)
        .values({
          type: "REVERSAL",
          description: "Admin approved return/refund reversal.",
          reversalOfTransactionId: completions[0].id,
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
          status: sql`case when ${listings.status} in ('ACTIVE', 'PARTIALLY_RESERVED', 'SOLD_OUT') then 'PENDING_REVIEW'::listing_status else ${listings.status} end`,
          updatedAt: new Date()
        })
        .where(eq(listings.id, order.listingId));
      await tx
        .update(inventoryReservations)
        .set({ releasedAt: new Date() })
        .where(eq(inventoryReservations.id, reservation.id));

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
