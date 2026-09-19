import { describe, expect, it } from "vitest";
import { creditAdminInputSchema } from "./admin-input";

const base = { organizationId: "00000000-0000-4000-8000-000000000001", reason: "Verified adjustment reason" };
describe("admin money inputs", () => {
  it("preserves blank upper limit instead of converting it to zero", () => {
    expect(creditAdminInputSchema.parse({ ...base, lowerLimit: -1000, upperLimit: "" }).upperLimit).toBe("");
    expect(creditAdminInputSchema.parse({ ...base, lowerLimit: -1000, upperLimit: "0" }).upperLimit).toBe(0);
  });
  it("rejects string booleans that could target all organizations accidentally", () => {
    expect(creditAdminInputSchema.safeParse({ ...base, lowerLimit: 0, applyToAll: "false" }).success).toBe(false);
  });
  it("requires an idempotency key for actual money changes", () => {
    const adjustment = { ...base, operation: "ADJUST_BALANCE", balanceDelta: 100 };
    expect(creditAdminInputSchema.safeParse(adjustment).success).toBe(false);
    expect(creditAdminInputSchema.safeParse({ ...adjustment, idempotencyKey: base.organizationId }).success).toBe(true);
  });
});
