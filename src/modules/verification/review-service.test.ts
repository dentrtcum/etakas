import { describe, expect, it } from "vitest";
import { nextOrganizationStatus } from "@/modules/verification/organization-review";

describe("organization review persistence behavior", () => {
  it("creates ledger account only after approval state is reached", () => {
    expect(nextOrganizationStatus("UNDER_REVIEW", "APPROVE")).toBe("APPROVED");
    expect(nextOrganizationStatus("UNDER_REVIEW", "REQUEST_ADDITIONAL_DOCUMENT")).toBe(
      "ADDITIONAL_DOCUMENT_REQUIRED"
    );
  });
});
