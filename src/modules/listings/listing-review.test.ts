import { describe, expect, it } from "vitest";
import {
  assertListingReviewReason,
  getAllowedListingReviewDecisions,
  nextListingStatus
} from "@/modules/listings/listing-review";

describe("listing review", () => {
  it("activates listings only through approval", () => {
    expect(nextListingStatus("PENDING_REVIEW", "APPROVE")).toBe("ACTIVE");
  });

  it("rejects invalid transitions", () => {
    expect(() => nextListingStatus("ACTIVE", "APPROVE")).toThrow("Invalid listing");
  });

  it("exposes review controls for pending listings", () => {
    expect(getAllowedListingReviewDecisions("PENDING_REVIEW")).toEqual([
      "APPROVE",
      "REQUEST_CHANGES",
      "REJECT"
    ]);
  });

  it("requires meaningful reasons", () => {
    expect(() => assertListingReviewReason("kısa")).toThrow("at least 10");
    expect(() => assertListingReviewReason("Fatura ve miat bilgileri uygun.")).not.toThrow();
  });
});
