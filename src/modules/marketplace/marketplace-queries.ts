import { and, asc, desc, eq, ne, gt, gte, ilike, lte, or, sql, inArray } from "drizzle-orm";
import { assertOrganizationRead } from "@/lib/db/access";
import { getDb } from "@/lib/db/client";
import { listings, organizations, productBatches, productCatalog } from "@/lib/db/schema";
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
