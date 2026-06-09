import { describe, expect, it } from "vitest";
import { canViewMarketplaceProduct } from "@/modules/marketplace/marketplace-policy";

describe("marketplace visibility policy", () => {
  it("hides human medicines from veterinary organizations", () => {
    expect(canViewMarketplaceProduct({ buyerType: "VETERINARY_CLINIC", productType: "HUMAN" })).toBe(false);
  });

  it("allows veterinary products for veterinary organizations", () => {
    expect(canViewMarketplaceProduct({ buyerType: "VETERINARY_CLINIC", productType: "VETERINARY" })).toBe(true);
  });
});
