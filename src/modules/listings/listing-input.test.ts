import { describe, expect, it } from "vitest";
import { parseListingSubmission } from "@/modules/listings/listing-input";

describe("listing submission input", () => {
  it("parses barcode, positive quantity and integer kurus values", () => {
    expect(
      parseListingSubmission({
        barcode: "8691234567890",
        expiryDate: "2027-12-31",
        quantity: "5",
        unitReferenceValueKurus: "12500"
      })
    ).toMatchObject({
      barcode: "8691234567890",
      quantity: 5,
      unitReferenceValueKurus: 12500
    });
  });

  it("rejects invalid barcode and zero quantity", () => {
    expect(() =>
      parseListingSubmission({
        barcode: "ABC",
        expiryDate: "2027-12-31",
        quantity: 0,
        unitReferenceValueKurus: 12500
      })
    ).toThrow();
  });
});
