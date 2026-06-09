import { describe, expect, it } from "vitest";
import { parseOrderCreation } from "@/modules/orders/order-input";

describe("order input", () => {
  it("requires positive integer quantity and idempotency key", () => {
    expect(
      parseOrderCreation({
        buyerOrganizationId: "00000000-0000-4000-8000-000000000001",
        listingId: "00000000-0000-4000-8000-000000000002",
        quantity: "2",
        idempotencyKey: "idempotency-key-0001"
      })
    ).toMatchObject({ quantity: 2 });
  });

  it("rejects zero quantity", () => {
    expect(() =>
      parseOrderCreation({
        buyerOrganizationId: "00000000-0000-4000-8000-000000000001",
        listingId: "00000000-0000-4000-8000-000000000002",
        quantity: 0,
        idempotencyKey: "idempotency-key-0001"
      })
    ).toThrow();
  });
});
