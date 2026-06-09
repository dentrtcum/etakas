import type { OrganizationKind, ProductKind } from "@/modules/compliance/trading-policy";

export function canViewMarketplaceProduct({
  buyerType,
  productType
}: {
  buyerType: OrganizationKind;
  productType: ProductKind;
}) {
  if (productType === "HUMAN" && buyerType !== "PHARMACY") {
    return false;
  }

  return true;
}

export function assertMarketplaceVisibility(input: {
  buyerType: OrganizationKind;
  productType: ProductKind;
}) {
  if (!canViewMarketplaceProduct(input)) {
    throw new Error("Product is not visible for this organization type.");
  }
}
