import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  listingDocuments,
  listingImages,
  listings,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import type { ListingReviewStatus } from "@/modules/listings/listing-review";

const listingQueueStatuses = [
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "ACTIVE",
  "PAUSED",
  "PARTIALLY_RESERVED"
] as const satisfies ListingReviewStatus[];

export async function listListingReviewQueue(page = 1) {
  const db = getDb();
  const rows = await db
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
    .limit(21)
    .offset((page - 1) * 20);

  const listingIds = rows.map((row) => row.id);
  const images =
    listingIds.length > 0
      ? await db
          .select({
            id: listingImages.id,
            listingId: listingImages.listingId,
            scanStatus: listingImages.scanStatus
          })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
      : [];
  const documents =
    listingIds.length > 0
      ? await db
          .select({
            id: listingDocuments.id,
            listingId: listingDocuments.listingId,
            kind: listingDocuments.kind,
            scanStatus: listingDocuments.scanStatus
          })
          .from(listingDocuments)
          .where(inArray(listingDocuments.listingId, listingIds))
      : [];

  return rows.map((row) => ({
    ...row,
    imageCount: images.filter((image) => image.listingId === row.id).length,
    images: images.filter((image) => image.listingId === row.id),
    documents: documents.filter((document) => document.listingId === row.id)
  }));
}
