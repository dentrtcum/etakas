import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLogs, listingReviews, listings } from "@/lib/db/schema";
import type { AppSessionUser } from "@/lib/auth/roles";
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
  assertListingReviewReason(reason);
  const db = getDb();

  return db.transaction(async (tx) => {
    const [listing] = await tx
      .select({
        id: listings.id,
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
