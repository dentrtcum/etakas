import { describe, expect, it } from "vitest";
import {
  calculateCreditCapacity,
  exceedsUpperCreditLimit,
  isBalanceWithinCreditLimits,
  lowerLimitToOverdraftKurus
} from "@/modules/ledger/credit-limits";

describe("credit limits", () => {
  it("stores a negative lower limit as overdraft capacity", () => {
    expect(lowerLimitToOverdraftKurus(-1_000)).toBe(100_000);
    expect(lowerLimitToOverdraftKurus(0)).toBe(0);
  });

  it("enforces an optional upper balance limit", () => {
    expect(exceedsUpperCreditLimit(90_000, 20_000, 100_000)).toBe(true);
    expect(exceedsUpperCreditLimit(80_000, 20_000, 100_000)).toBe(false);
    expect(exceedsUpperCreditLimit(9_000_000, 20_000, null)).toBe(false);
  });

  it("treats limits as boundaries without changing the actual balance", () => {
    expect(isBalanceWithinCreditLimits(-100_000, 100_000, 500_000)).toBe(true);
    expect(isBalanceWithinCreditLimits(-100_001, 100_000, 500_000)).toBe(false);
    expect(isBalanceWithinCreditLimits(500_001, 100_000, 500_000)).toBe(false);
    expect(isBalanceWithinCreditLimits(5_000_000, 100_000, null)).toBe(true);
  });

  it("calculates remaining buying and selling capacity separately", () => {
    expect(
      calculateCreditCapacity({
        balanceKurus: 50_000,
        heldKurus: 10_000,
        lowerLimitCapacityKurus: 100_000,
        upperLimitKurus: 200_000
      })
    ).toEqual({ buyingCapacityKurus: 140_000, sellingCapacityKurus: 150_000 });
  });
  it("reserves selling capacity for pending sales", () => {
    expect(calculateCreditCapacity({ balanceKurus: 50_000, heldKurus: 0,
      lowerLimitCapacityKurus: 100_000, upperLimitKurus: 200_000,
      pendingIncomingKurus: 120_000 }).sellingCapacityKurus).toBe(30_000);
  });
});
