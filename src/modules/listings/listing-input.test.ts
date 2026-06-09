import { describe, expect, it } from "vitest";
import { parseListingSubmission } from "@/modules/listings/listing-input";

describe("listing submission input", () => {
  it("parses positive quantity and integer kuruş values", () => {
    expect(
      parseListingSubmission({
        organizationId: "00000000-0000-4000-8000-000000000001",
        productId: "00000000-0000-4000-8000-000000000002",
        lotNumber: "LOT-1",
        expiryDate: "2027-12-31",
        quantity: "5",
        unitReferenceValueKurus: "12500"
      })
    ).toMatchObject({
      quantity: 5,
      unitReferenceValueKurus: 12500
    });
  });

  it("rejects zero quantity", () => {
    expect(() =>
      parseListingSubmission({
        organizationId: "00000000-0000-4000-8000-000000000001",
        productId: "00000000-0000-4000-8000-000000000002",
        lotNumber: "LOT-1",
        expiryDate: "2027-12-31",
        quantity: 0,
        unitReferenceValueKurus: 12500
      })
    ).toThrow();
  });
});
