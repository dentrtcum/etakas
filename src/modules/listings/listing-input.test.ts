import { describe, expect, it } from "vitest";
import {
  parseListingSubmission,
  parseListingSubmissionFormData
} from "@/modules/listings/listing-input";

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

  it("keeps manually supplied medicine details for an unknown barcode", () => {
    const formData = new FormData();
    formData.set("barcode", "8691234567890");
    formData.set("productName", "Manuel ilaç");
    formData.set("activeIngredient", "Etken madde");
    formData.set("manufacturer", "Ruhsat sahibi");
    formData.set("strength", "500 mg");
    formData.set("form", "Tablet");
    formData.set("expiryDate", "2027-12-31");
    formData.set("quantity", "2");
    formData.set("unitReferenceValue", "125.50");

    expect(parseListingSubmissionFormData(formData)).toMatchObject({
      productName: "Manuel ilaç",
      activeIngredient: "Etken madde",
      manufacturer: "Ruhsat sahibi",
      strength: "500 mg",
      form: "Tablet",
      unitReferenceValueKurus: 12550
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
