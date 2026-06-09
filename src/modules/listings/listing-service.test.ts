import { describe, expect, it } from "vitest";
import { assertListingExpiry } from "@/modules/listings/listing-service";

describe("listing service invariants", () => {
  it("blocks expired products before persistence", () => {
    expect(() => assertListingExpiry("2025-01-01", new Date("2026-06-09T00:00:00.000Z"))).toThrow(
      "Expired"
    );
  });

  it("allows future-dated products", () => {
    expect(() =>
      assertListingExpiry("2027-01-01", new Date("2026-06-09T00:00:00.000Z"))
    ).not.toThrow();
  });
});
