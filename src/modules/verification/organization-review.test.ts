import { describe, expect, it } from "vitest";
import { assertReviewReason, nextOrganizationStatus } from "@/modules/verification/organization-review";

describe("organization review state machine", () => {
  it("moves submitted applications under review", () => {
    expect(nextOrganizationStatus("SUBMITTED", "START_REVIEW")).toBe("UNDER_REVIEW");
  });

  it("approves applications only from review state", () => {
    expect(nextOrganizationStatus("UNDER_REVIEW", "APPROVE")).toBe("APPROVED");
    expect(() => nextOrganizationStatus("SUBMITTED", "APPROVE")).toThrow("Invalid organization");
  });

  it("requires meaningful admin reasons", () => {
    expect(() => assertReviewReason("eksik")).toThrow("at least 10");
    expect(() => assertReviewReason("Ruhsat belgesi okunaklı değil.")).not.toThrow();
  });
});
