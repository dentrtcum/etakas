import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  listings,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import type { ListingSubmissionInput } from "@/modules/listings/listing-input";

export class ListingSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingSubmissionError";
  }
}

function assertSubmissionConfig() {
  if (!serverEnv.DATABASE_URL) {
    throw new ListingSubmissionError("DATABASE_URL is required for listing submission.");
  }

  if (!serverEnv.ENCRYPTION_KEY) {
    throw new ListingSubmissionError("ENCRYPTION_KEY is required for listing submission.");
  }
}

export function assertListingExpiry(expiryDate: string, now = new Date()) {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  if (Number.isNaN(expiry.getTime()) || expiry <= now) {
    throw new ListingSubmissionError("Expired products cannot be listed.");
  }
}

export async function submitListingForReview(actor: AppSessionUser, input: ListingSubmissionInput) {
  assertSubmissionConfig();
  assertListingExpiry(input.expiryDate);

  const authorization = requireOrganizationAccess(actor, input.organizationId, [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_MANAGER",
    "INVENTORY_MANAGER"
  ]);

  if (!authorization.allowed) {
    throw new ListingSubmissionError(authorization.reason);
  }

  const db = getDb();
  const encryptionKey = serverEnv.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new ListingSubmissionError("ENCRYPTION_KEY is required for listing submission.");
  }

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id, status: organizations.status })
      .from(organizations)
      .where(and(eq(organizations.id, input.organizationId), eq(organizations.status, "APPROVED")))
      .limit(1);

    if (!organization) {
      throw new ListingSubmissionError("Only approved organizations can submit listings.");
    }

    const [product] = await tx
      .select({
        id: productCatalog.id,
        type: productCatalog.type,
        isActive: productCatalog.isActive,
        requiresColdChain: productCatalog.requiresColdChain,
        isBiological: productCatalog.isBiological,
        controlCategory: productCatalog.controlCategory
      })
      .from(productCatalog)
      .where(and(eq(productCatalog.id, input.productId), eq(productCatalog.isActive, true)))
      .limit(1);

    if (!product) {
      throw new ListingSubmissionError("Product catalog item is not active.");
    }

    if (
      product.requiresColdChain ||
      product.isBiological ||
      product.controlCategory !== "STANDARD"
    ) {
      throw new ListingSubmissionError("High-risk products are blocked by default.");
    }

    const [batch] = await tx
      .insert(productBatches)
      .values({
        organizationId: input.organizationId,
        productId: input.productId,
        lotNumberEncrypted: encryptField(input.lotNumber, encryptionKey),
        expiryDate: input.expiryDate,
        invoiceDate: input.invoiceDate,
        invoiceNumberEncrypted: input.invoiceNumber
          ? encryptField(input.invoiceNumber, encryptionKey)
          : null,
        unitReferenceValueKurus: input.unitReferenceValueKurus,
        totalQuantity: input.quantity,
        availableQuantity: input.quantity,
        reservedQuantity: 0,
        transferredQuantity: 0,
        storageConditions: input.storageConditions
      })
      .returning({ id: productBatches.id });

    if (!batch) {
      throw new ListingSubmissionError("Product batch could not be created.");
    }

    const [listing] = await tx
      .insert(listings)
      .values({
        sellerOrganizationId: input.organizationId,
        batchId: batch.id,
        status: "PENDING_REVIEW",
        unitReferenceValueKurus: input.unitReferenceValueKurus,
        quantityAvailable: input.quantity,
        quantityReserved: 0,
        minExpiryDate: input.expiryDate,
        submittedAt: new Date()
      })
      .returning({ id: listings.id, status: listings.status });

    if (!listing) {
      throw new ListingSubmissionError("Listing could not be created.");
    }

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: input.organizationId,
      action: "LISTING_SUBMITTED_FOR_REVIEW",
      targetType: "listing",
      targetId: listing.id,
      safeBefore: null,
      safeAfter: {
        productId: input.productId,
        quantity: input.quantity,
        unitReferenceValueKurus: input.unitReferenceValueKurus,
        expiryDate: input.expiryDate
      },
      correlationId: randomUUID(),
      reason: "Organization submitted inventory listing for admin review."
    });

    return listing;
  });
}
