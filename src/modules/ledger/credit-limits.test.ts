import { describe, expect, it } from "vitest";
import {
  adjustOverdraftKurus,
  exceedsUpperCreditLimit,
  lowerLimitToOverdraftKurus
} from "@/modules/ledger/credit-limits";

describe("credit limits", () => {
  it("stores a negative lower limit as overdraft capacity", () => {
    expect(lowerLimitToOverdraftKurus(-1_000)).toBe(100_000);
    expect(lowerLimitToOverdraftKurus(0)).toBe(0);
  });

  it("supports direct positive and negative limit adjustments without going below zero", () => {
    expect(adjustOverdraftKurus(500_000, 1_000)).toBe(600_000);
    expect(adjustOverdraftKurus(500_000, -1_000)).toBe(400_000);
    expect(adjustOverdraftKurus(50_000, -1_000)).toBe(0);
  });

  it("enforces an optional upper balance limit", () => {
    expect(exceedsUpperCreditLimit(90_000, 20_000, 100_000)).toBe(true);
    expect(exceedsUpperCreditLimit(80_000, 20_000, 100_000)).toBe(false);
    expect(exceedsUpperCreditLimit(9_000_000, 20_000, null)).toBe(false);
  });
});
