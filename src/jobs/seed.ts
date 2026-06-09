import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import {
  auditLogs,
  ledgerAccounts,
  listings,
  organizationAddresses,
  organizationMembers,
  organizations,
  productBatches,
  productCatalog,
  userRoles,
  users
} from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import { seedIds, syntheticSeedData } from "@/jobs/seed-data";

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed cannot run in production.");
}

if (!serverEnv.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for db:seed.");
}

if (!serverEnv.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is required for db:seed.");
}

const encryptionKey = serverEnv.ENCRYPTION_KEY;
const db = getDb();

await db.transaction(async (tx) => {
  for (const user of syntheticSeedData.users) {
    await tx
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
        passwordHash: hashPassword(user.password),
        totpEnabled: user.totpEnabled
      })
      .onConflictDoNothing();

    await tx.insert(userRoles).values({ userId: user.id, role: user.role }).onConflictDoNothing();
  }

  for (const organization of syntheticSeedData.organizations) {
    await tx
      .insert(organizations)
      .values({
        id: organization.id,
        type: organization.type,
        status: organization.status,
        legalNameEncrypted: encryptField(organization.legalName, encryptionKey),
        publicAlias: organization.publicAlias,
        taxNumberEncrypted: encryptField(organization.taxNumber, encryptionKey),
        licenseNumberEncrypted: encryptField(organization.licenseNumber, encryptionKey),
        province: organization.province,
        district: organization.district,
        approvedAt: organization.status === "APPROVED" ? new Date() : null,
        suspendedAt: organization.status === "SUSPENDED" ? new Date() : null
      })
      .onConflictDoNothing();

    await tx
      .insert(organizationAddresses)
      .values({
        id: organization.addressId,
        organizationId: organization.id,
        addressEncrypted: encryptField(organization.address, encryptionKey),
        phoneEncrypted: encryptField(organization.phone, encryptionKey)
      })
      .onConflictDoNothing();

    await tx
      .insert(organizationMembers)
      .values({
        organizationId: organization.id,
        userId: organization.ownerUserId,
        role: "ORGANIZATION_OWNER"
      })
      .onConflictDoNothing();

    if (organization.status === "APPROVED") {
      await tx.insert(ledgerAccounts).values({ organizationId: organization.id }).onConflictDoNothing();
    }
  }

  for (const product of syntheticSeedData.products) {
    await tx
      .insert(productCatalog)
      .values({
        id: product.id,
        name: product.name,
        type: product.type,
        gtin: product.gtin,
        activeIngredient: product.activeIngredient
      })
      .onConflictDoNothing();
  }

  await tx
    .insert(productBatches)
    .values([
      {
        id: seedIds.batches.human,
        organizationId: seedIds.organizations.approvedPharmacy,
        productId: seedIds.products.human,
        lotNumberEncrypted: encryptField("SYN-LOT-HUMAN-001", encryptionKey),
        expiryDate: "2027-12-31",
        invoiceDate: "2026-01-15",
        invoiceNumberEncrypted: encryptField("SYN-INV-001", encryptionKey),
        unitReferenceValueKurus: 12500,
        totalQuantity: 20,
        availableQuantity: 15,
        reservedQuantity: 0,
        transferredQuantity: 5,
        storageConditions: "Oda sıcaklığı"
      },
      {
        id: seedIds.batches.veterinary,
        organizationId: seedIds.organizations.approvedClinic,
        productId: seedIds.products.veterinary,
        lotNumberEncrypted: encryptField("SYN-LOT-VET-001", encryptionKey),
        expiryDate: "2027-10-31",
        invoiceDate: "2026-02-20",
        invoiceNumberEncrypted: encryptField("SYN-INV-002", encryptionKey),
        unitReferenceValueKurus: 8500,
        totalQuantity: 12,
        availableQuantity: 12,
        reservedQuantity: 0,
        transferredQuantity: 0,
        storageConditions: "Oda sıcaklığı"
      }
    ])
    .onConflictDoNothing();

  await tx
    .insert(listings)
    .values([
      {
        id: seedIds.listings.activeHuman,
        sellerOrganizationId: seedIds.organizations.approvedPharmacy,
        batchId: seedIds.batches.human,
        status: "ACTIVE",
        unitReferenceValueKurus: 12500,
        quantityAvailable: 15,
        quantityReserved: 0,
        minExpiryDate: "2027-12-31",
        submittedAt: new Date(),
        approvedAt: new Date()
      },
      {
        id: seedIds.listings.pendingVeterinary,
        sellerOrganizationId: seedIds.organizations.approvedClinic,
        batchId: seedIds.batches.veterinary,
        status: "PENDING_REVIEW",
        unitReferenceValueKurus: 8500,
        quantityAvailable: 12,
        quantityReserved: 0,
        minExpiryDate: "2027-10-31",
        submittedAt: new Date()
      }
    ])
    .onConflictDoNothing();

  await tx.insert(auditLogs).values({
    actorUserId: seedIds.users.superAdmin,
    organizationId: null,
    action: "SYNTHETIC_SEED_CREATED",
    targetType: "seed",
    targetId: null,
    safeBefore: null,
    safeAfter: {
      users: syntheticSeedData.users.length,
      organizations: syntheticSeedData.organizations.length,
      products: syntheticSeedData.products.length
    },
    correlationId: randomUUID(),
    reason: "Synthetic development seed data created."
  });
});

console.log(
  `Seeded ${syntheticSeedData.users.length} users, ${syntheticSeedData.organizations.length} organizations and ${syntheticSeedData.products.length} products.`
);
