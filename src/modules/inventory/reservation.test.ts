import { describe, expect, it } from "vitest";
import { releaseReservedStock, reserveStock } from "@/modules/inventory/reservation";

describe("inventory reservation", () => {
  it("moves available stock into reserved stock atomically at the domain boundary", () => {
    expect(
      reserveStock(
        {
          totalQuantity: 10,
          availableQuantity: 6,
          reservedQuantity: 2,
          transferredQuantity: 2
        },
        3
      )
    ).toEqual({
      totalQuantity: 10,
      availableQuantity: 3,
      reservedQuantity: 5,
      transferredQuantity: 2
    });
  });

  it("prevents overselling", () => {
    expect(() =>
      reserveStock(
        {
          totalQuantity: 1,
          availableQuantity: 1,
          reservedQuantity: 0,
          transferredQuantity: 0
        },
        2
      )
    ).toThrow("Insufficient available stock");
  });

  it("releases cancelled reservations", () => {
    expect(
      releaseReservedStock(
        {
          totalQuantity: 5,
          availableQuantity: 1,
          reservedQuantity: 4,
          transferredQuantity: 0
        },
        2
      )
    ).toMatchObject({ availableQuantity: 3, reservedQuantity: 2 });
  });
});
