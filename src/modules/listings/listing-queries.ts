import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { listings, organizations, productBatches, productCatalog } from "@/lib/db/schema";
import type { ListingReviewStatus } from "@/modules/listings/listing-review";

const listingQueueStatuses = ["PENDING_REVIEW", "CHANGES_REQUESTED"] as const satisfies ListingReviewStatus[];

export async function listListingReviewQueue() {
  const db = getDb();
  return db
    .select({
      id: listings.id,
      status: listings.status,
      quantityAvailable: listings.quantityAvailable,
      unitReferenceValueKurus: listings.unitReferenceValueKurus,
      minExpiryDate: listings.minExpiryDate,
      sellerPublicAlias: organizations.publicAlias,
      sellerProvince: organizations.province,
      sellerDistrict: organizations.district,
      productName: productCatalog.name,
      productType: productCatalog.type,
      productGtin: productCatalog.gtin,
      batchId: productBatches.id
    })
    .from(listings)
    .innerJoin(organizations, eq(organizations.id, listings.sellerOrganizationId))
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .where(inArray(listings.status, listingQueueStatuses))
    .orderBy(desc(listings.updatedAt), desc(listings.createdAt))
    .limit(50);
}
