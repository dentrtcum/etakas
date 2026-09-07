import { describe, it, expect } from "vitest";
import { assertAdminOrderDecision, getAllowedAdminOrderDecisions } from "./order-state";
describe("admin order state invariants", () => {
  it("only permits refund for completed transfers", () => {
    expect(getAllowedAdminOrderDecisions("COMPLETED")).toEqual(["REFUND_COMPLETED"]);
    expect(() => assertAdminOrderDecision("COMPLETED", "FREEZE")).toThrow();
    expect(() => assertAdminOrderDecision("COMPLETED", "CANCEL")).toThrow();
  });
  it("prevents a repeated cancellation or refund", () => {
    expect(getAllowedAdminOrderDecisions("CANCELLED")).toEqual([]);
    expect(() => assertAdminOrderDecision("CANCELLED", "REFUND_COMPLETED")).toThrow();
    expect(() => assertAdminOrderDecision("CANCELLED", "CANCEL")).toThrow();
  });
  it("allows resolution of a disputed reserved transfer", () => {
    expect(getAllowedAdminOrderDecisions("DISPUTED")).toContain("FORCE_COMPLETE");
    expect(getAllowedAdminOrderDecisions("DISPUTED")).not.toContain("REFUND_COMPLETED");
  });
  it("requires a delivery or review state before forced completion", () => {
    expect(() => assertAdminOrderDecision("RESERVED", "FORCE_COMPLETE")).toThrow();
    expect(() =>
      assertAdminOrderDecision("BUYER_CONFIRMATION_PENDING", "FORCE_COMPLETE")
    ).not.toThrow();
  });
});
