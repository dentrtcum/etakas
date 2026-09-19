import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { assertAdminRead, assertOrganizationRead } from "@/lib/db/access";
import { getDb } from "@/lib/db/client";
import {
  deliveryConfirmations,
  disputes,
  listings,
  organizationAddresses,
  organizationMembers,
  organizations,
  orderItems,
  orders,
  productBatches,
  productCatalog,
  users
} from "@/lib/db/schema";
import { decryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";

function decryptContact(value: string | null) {
  if (!value || !serverEnv.ENCRYPTION_KEY) return null;
  try {
    return decryptField(value, serverEnv.ENCRYPTION_KEY);
  } catch {
    return null;
  }
}

async function loadOrderParties(organizationIds: string[]) {
  const uniqueIds = [...new Set(organizationIds)];
  if (!uniqueIds.length) return new Map();
  const db = getDb();
  const [organizationRows, addressRows, memberRows] = await Promise.all([
    db
      .select({
        id: organizations.id,
        publicAlias: organizations.publicAlias,
        legalNameEncrypted: organizations.legalNameEncrypted,
        authorizedPersonNameEncrypted: organizations.authorizedPersonNameEncrypted,
        contactEmailEncrypted: organizations.contactEmailEncrypted,
        province: organizations.province,
        district: organizations.district
      })
      .from(organizations)
      .where(inArray(organizations.id, uniqueIds)),
    db
      .select({
        organizationId: organizationAddresses.organizationId,
        addressEncrypted: organizationAddresses.addressEncrypted,
        phoneEncrypted: organizationAddresses.phoneEncrypted
      })
      .from(organizationAddresses)
      .where(inArray(organizationAddresses.organizationId, uniqueIds)),
    db
      .select({
        organizationId: organizationMembers.organizationId,
        name: users.name,
        email: users.email,
        role: organizationMembers.role
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(inArray(organizationMembers.organizationId, uniqueIds))
  ]);

  return new Map(
    organizationRows.map((organization) => {
      const address = addressRows.find((item) => item.organizationId === organization.id);
      const member = memberRows.find(
        (item) =>
          item.organizationId === organization.id &&
          ["ORGANIZATION_OWNER", "ORGANIZATION_MANAGER"].includes(item.role)
      );
      return [
        organization.id,
        {
          id: organization.id,
          pharmacyName: decryptContact(organization.legalNameEncrypted) ?? organization.publicAlias,
          publicAlias: organization.publicAlias,
          contactName:
            decryptContact(organization.authorizedPersonNameEncrypted) ?? member?.name ?? null,
          email: decryptContact(organization.contactEmailEncrypted) ?? member?.email ?? null,
          phone: decryptContact(address?.phoneEncrypted ?? null),
          address: decryptContact(address?.addressEncrypted ?? null),
          province: organization.province,
          district: organization.district
        }
      ] as const;
    })
  );
}

export async function listAdminOrderQueue(page = 1) {
  await assertAdminRead();
  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      buyerOrganizationId: orders.buyerOrganizationId,
      sellerOrganizationId: orders.sellerOrganizationId,
      listingId: orders.listingId,
      quantity: orders.quantity,
      totalReferenceValueKurus: orders.totalReferenceValueKurus,
      handoverDeclaredAt: orders.handoverDeclaredAt,
      autoCompleteAfter: orders.autoCompleteAfter,
      completedAt: orders.completedAt,
      cancelledAt: orders.cancelledAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      productName: sql<string>`coalesce(${productBatches.submittedName}, ${productCatalog.name})`,
      productGtin: productCatalog.gtin,
      productType: productCatalog.type,
      expiryDate: productBatches.expiryDate,
      unitReferenceValueKurus: orderItems.unitReferenceValueKurus,
      batchId: orderItems.batchId
    })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
    .limit(21)
    .offset((page - 1) * 20);

  const orderIds = rows.map((row) => row.id);
  const [parties, confirmations, orderDisputes] = await Promise.all([
    loadOrderParties(rows.flatMap((row) => [row.buyerOrganizationId, row.sellerOrganizationId])),
    orderIds.length
      ? db
          .select()
          .from(deliveryConfirmations)
          .where(inArray(deliveryConfirmations.orderId, orderIds))
          .orderBy(deliveryConfirmations.createdAt)
      : [],
    orderIds.length
      ? db
          .select()
          .from(disputes)
          .where(inArray(disputes.orderId, orderIds))
          .orderBy(disputes.createdAt)
      : []
  ]);

  return rows.map((row) => ({
    ...row,
    buyer: parties.get(row.buyerOrganizationId),
    seller: parties.get(row.sellerOrganizationId),
    deliveryConfirmations: confirmations.filter((item) => item.orderId === row.id),
    disputes: orderDisputes.filter((item) => item.orderId === row.id)
  }));
}

export async function listOrganizationOrders(organizationId: string) {
  await assertOrganizationRead(organizationId);
  const rows = await getDb()
    .select({
      id: orders.id,
      status: orders.status,
      buyerOrganizationId: orders.buyerOrganizationId,
      sellerOrganizationId: orders.sellerOrganizationId,
      listingId: orders.listingId,
      quantity: orders.quantity,
      total: orders.totalReferenceValueKurus,
      handoverDeclaredAt: orders.handoverDeclaredAt,
      completedAt: orders.completedAt,
      cancelledAt: orders.cancelledAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      productName: sql<string>`coalesce(${productBatches.submittedName}, ${productCatalog.name})`,
      productGtin: productCatalog.gtin,
      expiryDate: productBatches.expiryDate
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
    .orderBy(desc(orders.updatedAt), orders.id)
    .limit(100);

  const parties = await loadOrderParties(
    rows.flatMap((row) => [row.buyerOrganizationId, row.sellerOrganizationId])
  );
  return rows.map((row) => ({
    ...row,
    buyer: parties.get(row.buyerOrganizationId),
    seller: parties.get(row.sellerOrganizationId)
  }));
}
