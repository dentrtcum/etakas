import { and, asc, desc, eq, ne, gt, gte, ilike, lte, or, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { assertOrganizationRead } from "@/lib/db/access";
import { getDb } from "@/lib/db/client";
import {
  listingImages,
  listings,
  orders,
  organizations,
  productBatches,
  productCatalog
} from "@/lib/db/schema";
import { assertMarketplaceVisibility } from "@/modules/marketplace/marketplace-policy";
import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";

export async function listMarketplaceListingsForOrganization(
  organizationId: string,
  filters: {
    search?: string;
    province?: string;
    productType?: "HUMAN" | "VETERINARY";
    minQuantity?: number;
    expiresWithinDays?: number;
    sort?: "newest" | "expiry" | "value_asc" | "value_desc";
  } = {},
  page = 1
) {
  await assertOrganizationRead(organizationId);
  const db = getDb();
  const [buyer] = await db
    .select({ id: organizations.id, type: organizations.type, status: organizations.status })
    .from(organizations)
    .where(and(eq(organizations.id, organizationId), eq(organizations.status, "APPROVED")))
    .limit(1);

  if (!buyer) {
    throw new Error("Only approved organizations can view marketplace listings.");
  }

  const rows = await db
    .select({
      id: listings.id,
      status: listings.status,
      sellerOrganizationId: listings.sellerOrganizationId,
      sellerPublicAlias: organizations.publicAlias,
      sellerProvince: organizations.province,
      sellerDistrict: organizations.district,
      productName: sql<string>`coalesce(${productBatches.submittedName}, ${productCatalog.name})`,
      productType: productCatalog.type,
      productGtin: productCatalog.gtin,
      quantityAvailable: listings.quantityAvailable,
      unitReferenceValueKurus: listings.unitReferenceValueKurus,
      minExpiryDate: listings.minExpiryDate
    })
    .from(listings)
    .innerJoin(organizations, eq(organizations.id, listings.sellerOrganizationId))
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .where(
      and(
        inArray(listings.status, ["ACTIVE", "PARTIALLY_RESERVED"]),
        gt(listings.quantityAvailable, 0),
        gt(productBatches.expiryDate, new Date().toISOString().slice(0, 10)),
        eq(productCatalog.isActive, true),
        eq(productCatalog.requiresColdChain, false),
        eq(productCatalog.isBiological, false),
        eq(productCatalog.controlCategory, "STANDARD"),
        buyer.type !== "PHARMACY" ? eq(productCatalog.type, "VETERINARY") : undefined,
        filters.search
          ? or(
              ilike(productCatalog.name, `%${filters.search.slice(0, 120)}%`),
              ilike(productBatches.submittedName, `%${filters.search.slice(0, 120)}%`),
              ilike(productCatalog.gtin, `%${filters.search.slice(0, 120)}%`)
            )
          : undefined,
        filters.province ? ilike(organizations.province, filters.province.slice(0, 80)) : undefined,
        filters.productType ? eq(productCatalog.type, filters.productType) : undefined,
        filters.minQuantity ? gte(listings.quantityAvailable, filters.minQuantity) : undefined,
        filters.expiresWithinDays
          ? lte(
              productBatches.expiryDate,
              new Date(Date.now() + filters.expiresWithinDays * 86_400_000)
                .toISOString()
                .slice(0, 10)
            )
          : undefined,
        ne(listings.sellerOrganizationId, organizationId),
        eq(organizations.status, "APPROVED")
      )
    )
    .orderBy(
      filters.sort === "expiry"
        ? asc(listings.minExpiryDate)
        : filters.sort === "value_asc"
          ? asc(listings.unitReferenceValueKurus)
          : filters.sort === "value_desc"
            ? desc(listings.unitReferenceValueKurus)
            : desc(listings.updatedAt),
      desc(listings.createdAt)
    )
    .limit(13)
    .offset((page - 1) * 12);

  return rows.filter((row) => {
    try {
      assertMarketplaceVisibility({
        buyerType: buyer.type as OrganizationKind,
        productType: row.productType as ProductKind
      });
      return true;
    } catch {
      return false;
    }
  });
}

export async function getMarketplaceListingForOrganization(
  organizationId: string,
  listingId: string
) {
  await assertOrganizationRead(organizationId);
  listingId = z.string().uuid().parse(listingId);
  const db = getDb();
  const [buyer] = await db
    .select({ type: organizations.type, status: organizations.status })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!buyer || buyer.status !== "APPROVED") return null;

  const [listing] = await db
    .select({
      id: listings.id,
      status: listings.status,
      sellerOrganizationId: listings.sellerOrganizationId,
      sellerPublicAlias: organizations.publicAlias,
      sellerProvince: organizations.province,
      sellerDistrict: organizations.district,
      productName: sql<string>`coalesce(${productBatches.submittedName}, ${productCatalog.name})`,
      productType: productCatalog.type,
      productGtin: productCatalog.gtin,
      activeIngredient: productCatalog.activeIngredient,
      manufacturer: productCatalog.manufacturer,
      strength: productCatalog.strength,
      form: productCatalog.form,
      packageShape: productCatalog.packageShape,
      storageConditions: productBatches.storageConditions,
      quantityAvailable: listings.quantityAvailable,
      quantityReserved: listings.quantityReserved,
      unitReferenceValueKurus: listings.unitReferenceValueKurus,
      minExpiryDate: listings.minExpiryDate,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt
    })
    .from(listings)
    .innerJoin(organizations, eq(organizations.id, listings.sellerOrganizationId))
    .innerJoin(productBatches, eq(productBatches.id, listings.batchId))
    .innerJoin(productCatalog, eq(productCatalog.id, productBatches.productId))
    .where(
      and(
        eq(listings.id, listingId),
        inArray(listings.status, ["ACTIVE", "PARTIALLY_RESERVED", "SOLD_OUT"]),
        ne(listings.sellerOrganizationId, organizationId),
        eq(organizations.status, "APPROVED")
      )
    )
    .limit(1);
  if (!listing) return null;
  try {
    assertMarketplaceVisibility({
      buyerType: buyer.type as OrganizationKind,
      productType: listing.productType as ProductKind
    });
  } catch {
    return null;
  }

  const [images, purchases] = await Promise.all([
    db
      .select({ id: listingImages.id, scanStatus: listingImages.scanStatus })
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId))
      .orderBy(listingImages.createdAt),
    db
      .select({
        orderId: orders.id,
        buyerName: organizations.publicAlias,
        quantity: orders.quantity,
        completedAt: orders.completedAt
      })
      .from(orders)
      .innerJoin(organizations, eq(organizations.id, orders.buyerOrganizationId))
      .where(and(eq(orders.listingId, listingId), eq(orders.status, "COMPLETED")))
      .orderBy(desc(orders.completedAt), desc(orders.createdAt))
      .limit(100)
  ]);

  return {
    ...listing,
    images: images.filter((image) => ["UPLOADED", "CLEAN"].includes(image.scanStatus)),
    purchases
  };
}
