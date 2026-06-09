import { describe, expect, it } from "vitest";
import { assertBalancedLedger, calculateAccountBalance } from "@/modules/ledger/ledger";

describe("ledger", () => {
  it("accepts balanced double-entry transactions", () => {
    expect(() =>
      assertBalancedLedger([
        { accountId: "buyer", direction: "DEBIT", amountKurus: 1250 },
        { accountId: "seller", direction: "CREDIT", amountKurus: 1250 }
      ])
    ).not.toThrow();
  });

  it("rejects unbalanced transactions", () => {
    expect(() =>
      assertBalancedLedger([
        { accountId: "buyer", direction: "DEBIT", amountKurus: 1250 },
        { accountId: "seller", direction: "CREDIT", amountKurus: 1200 }
      ])
    ).toThrow("not balanced");
  });

  it("calculates account balance from immutable entries", () => {
    expect(
      calculateAccountBalance("seller", [
        { accountId: "seller", direction: "CREDIT", amountKurus: 1250 },
        { accountId: "seller", direction: "DEBIT", amountKurus: 250 }
      ])
    ).toBe(1000);
  });
});
