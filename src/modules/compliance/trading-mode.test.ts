import { describe, expect, it } from "vitest";
import { assertTradingModeAllowed } from "@/modules/compliance/trading-mode";

describe("trading mode", () => {
  it("keeps production trading closed without legal approval", () => {
    expect(() =>
      assertTradingModeAllowed({ mode: "production", legalApprovalConfirmed: false })
    ).toThrow("legal approval");
  });

  it("allows demo mode without legal approval", () => {
    expect(() => assertTradingModeAllowed({ mode: "demo", legalApprovalConfirmed: false })).not.toThrow();
  });
});
