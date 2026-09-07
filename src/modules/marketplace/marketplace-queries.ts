import { and, desc, eq, ne, gt, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { listings, organizations, productBatches, productCatalog } from "@/lib/db/schema";
import { assertMarketplaceVisibility } from "@/modules/marketplace/marketplace-policy";
import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";

export async function listMarketplaceListingsForOrganization(
  organizationId: string,
  search = "",
  page = 1
) {
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
      productName: productCatalog.name,
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
        eq(listings.status, "ACTIVE"),
        gt(listings.quantityAvailable, 0),
        gt(productBatches.expiryDate, new Date().toISOString().slice(0, 10)),
        eq(productCatalog.isActive, true),
        eq(productCatalog.requiresColdChain, false),
        eq(productCatalog.isBiological, false),
        eq(productCatalog.controlCategory, "STANDARD"),
        buyer.type !== "PHARMACY" ? eq(productCatalog.type, "VETERINARY") : undefined,
        search
          ? or(
              ilike(productCatalog.name, `%${search.slice(0, 120)}%`),
              ilike(productCatalog.gtin, `%${search.slice(0, 120)}%`)
            )
          : undefined,
        ne(listings.sellerOrganizationId, organizationId),
        eq(organizations.status, "APPROVED")
      )
    )
    .orderBy(desc(listings.updatedAt), desc(listings.createdAt))
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
