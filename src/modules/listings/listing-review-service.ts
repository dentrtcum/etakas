import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  listingReviews,
  listings,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import type { AppSessionUser } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/authorization";
import { SecurityError } from "@/lib/security/request-guards";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
import { assertListingExpiry } from "@/modules/listings/listing-service";
import { z } from "zod";
import {
  assertListingReviewReason,
  nextListingStatus,
  type ListingReviewDecision,
  type ListingReviewStatus
} from "@/modules/listings/listing-review";

export async function reviewListing({
  actor,
  listingId,
  decision,
  reason
}: {
  actor: AppSessionUser;
  listingId: string;
  decision: ListingReviewDecision;
  reason: string;
}) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  listingId = z.string().uuid().parse(listingId);
  reason = z.string().trim().max(2000).parse(reason);
  assertListingReviewReason(reason);
  const db = getDb();

  return db.transaction(async (tx) => {
    await lockAccounting(tx);
    const [listing] = await tx
      .select({
        id: listings.id,
        batchId: listings.batchId,
        quantityAvailable: listings.quantityAvailable,
        status: listings.status,
        sellerOrganizationId: listings.sellerOrganizationId
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .for("update")
      .limit(1);

    if (!listing) {
      throw new Error("Listing not found.");
    }

    const nextStatus = nextListingStatus(listing.status as ListingReviewStatus, decision);
    if (nextStatus === "ACTIVE") {
      const [organization] = await tx
        .select({ status: organizations.status, type: organizations.type })
        .from(organizations)
        .where(eq(organizations.id, listing.sellerOrganizationId))
        .limit(1);
      const [product] = await tx
        .select({
          expiryDate: productBatches.expiryDate,
          organizationId: productBatches.organizationId,
          availableQuantity: productBatches.availableQuantity,
          isActive: productCatalog.isActive,
          type: productCatalog.type,
          requiresColdChain: productCatalog.requiresColdChain,
          isBiological: productCatalog.isBiological,
          controlCategory: productCatalog.controlCategory
        })
        .from(productBatches)
        .innerJoin(productCatalog, eq(productBatches.productId, productCatalog.id))
        .where(eq(productBatches.id, listing.batchId))
        .limit(1);
      if (
        organization?.status !== "APPROVED" ||
        !product ||
        product.organizationId !== listing.sellerOrganizationId ||
        !product.isActive ||
        product.requiresColdChain ||
        product.isBiological ||
        product.controlCategory !== "STANDARD" ||
        (organization.type !== "PHARMACY" && product.type === "HUMAN") ||
        listing.quantityAvailable <= 0 ||
        product.availableQuantity < listing.quantityAvailable
      )
        throw new Error("Listing is not eligible for approval.");
      assertListingExpiry(product.expiryDate);
    }
    const [updated] = await tx
      .update(listings)
      .set({
        status: nextStatus,
        approvedAt: nextStatus === "ACTIVE" ? new Date() : null,
        adminReviewNote: reason,
        updatedAt: new Date()
      })
      .where(eq(listings.id, listingId))
      .returning({ id: listings.id, status: listings.status });

    if (!updated) {
      throw new Error("Listing review could not be saved.");
    }

    await tx.insert(listingReviews).values({
      listingId,
      reviewerUserId: actor.id,
      decision: nextStatus,
      reason
    });

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId: listing.sellerOrganizationId,
      action: `LISTING_REVIEW_${decision}`,
      targetType: "listing",
      targetId: listingId,
      safeBefore: { status: listing.status },
      safeAfter: { status: nextStatus },
      correlationId: randomUUID(),
      reason
    });

    return updated;
  });
}
