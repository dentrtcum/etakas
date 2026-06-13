import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { AppSessionUser } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  listingDocuments,
  listingImages,
  listings,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import { uploadPrivateFile, type UploadableFile } from "@/lib/storage/blob-storage";
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

function inferProductType(organizationType: string) {
  return organizationType === "PHARMACY" ? "HUMAN" : "VETERINARY";
}

function buildSystemLotNumber(barcode: string, expiryDate: string) {
  return `BARCODE-${barcode}-${expiryDate}-${randomUUID()}`;
}

export async function submitListingForReview(
  actor: AppSessionUser,
  input: ListingSubmissionInput,
  evidence: { kind: "image" | "invoice" | "package" | "other"; file: UploadableFile }[] = []
) {
  assertSubmissionConfig();
  assertListingExpiry(input.expiryDate);

  const db = getDb();
  const encryptionKey = serverEnv.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new ListingSubmissionError("ENCRYPTION_KEY is required for listing submission.");
  }

  const uploadedEvidence = await Promise.all(
    evidence.map(async (item) => ({
      kind: item.kind,
      ...(await uploadPrivateFile({
        file: item.file,
        folder: "listing-evidence",
        kind: item.kind
      }))
    }))
  );

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id, type: organizations.type, status: organizations.status })
      .from(organizations)
      .where(
        actor.organizationIds.length > 0
          ? and(inArray(organizations.id, actor.organizationIds), eq(organizations.status, "APPROVED"))
          : eq(organizations.id, "00000000-0000-0000-0000-000000000000")
      )
      .limit(1);

    if (!organization) {
      throw new ListingSubmissionError("Only approved organizations can submit listings.");
    }

    const [existingProduct] = await tx
      .select({
        id: productCatalog.id,
        type: productCatalog.type,
        isActive: productCatalog.isActive,
        requiresColdChain: productCatalog.requiresColdChain,
        isBiological: productCatalog.isBiological,
        controlCategory: productCatalog.controlCategory
      })
      .from(productCatalog)
      .where(and(eq(productCatalog.gtin, input.barcode), eq(productCatalog.isActive, true)))
      .limit(1);

    const product =
      existingProduct ??
      (
        await tx
          .insert(productCatalog)
          .values({
            name: `Barkod ${input.barcode}`,
            type: inferProductType(organization.type),
            gtin: input.barcode,
            controlCategory: "STANDARD",
            isActive: true
          })
          .onConflictDoUpdate({
            target: productCatalog.gtin,
            set: { isActive: true, updatedAt: new Date() }
          })
          .returning({
            id: productCatalog.id,
            type: productCatalog.type,
            isActive: productCatalog.isActive,
            requiresColdChain: productCatalog.requiresColdChain,
            isBiological: productCatalog.isBiological,
            controlCategory: productCatalog.controlCategory
          })
      )[0];

    if (!product) {
      throw new ListingSubmissionError("Product catalog item could not be prepared.");
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
        organizationId: organization.id,
        productId: product.id,
        lotNumberEncrypted: encryptField(buildSystemLotNumber(input.barcode, input.expiryDate), encryptionKey),
        expiryDate: input.expiryDate,
        invoiceDate: null,
        invoiceNumberEncrypted: null,
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
        sellerOrganizationId: organization.id,
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

    const imageEvidence = uploadedEvidence.filter((item) => item.kind === "image" || item.kind === "package");
    const documentEvidence = uploadedEvidence.filter((item) => item.kind !== "image" && item.kind !== "package");

    if (imageEvidence.length > 0) {
      await tx.insert(listingImages).values(
        imageEvidence.map((item) => ({
          listingId: listing.id,
          storageKey: item.storageKey,
          scanStatus: "UPLOADED" as const
        }))
      );
    }

    if (documentEvidence.length > 0) {
      await tx.insert(listingDocuments).values(
        documentEvidence.map((item) => ({
          listingId: listing.id,
          kind: item.kind,
          storageKey: item.storageKey,
          scanStatus: "UPLOADED" as const
        }))
      );
    }

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: organization.id,
      action: "LISTING_SUBMITTED_FOR_REVIEW",
      targetType: "listing",
      targetId: listing.id,
      safeBefore: null,
      safeAfter: {
        productId: product.id,
        barcode: input.barcode,
        quantity: input.quantity,
        unitReferenceValueKurus: input.unitReferenceValueKurus,
        expiryDate: input.expiryDate,
        evidenceCount: uploadedEvidence.length
      },
      correlationId: randomUUID(),
      reason: "Organization submitted inventory listing for admin review."
    });

    return listing;
  });
}
