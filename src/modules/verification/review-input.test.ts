import { describe, expect, it } from "vitest";
import { parseOrganizationReviewFormData } from "@/modules/verification/review-input";

describe("organization review input", () => {
  it("parses form data from admin review controls", () => {
    const formData = new FormData();
    formData.set("organizationId", "00000000-0000-4000-8000-000000000001");
    formData.set("decision", "START_REVIEW");
    formData.set("reason", "Başvuru incelemeye alındı.");

    expect(parseOrganizationReviewFormData(formData)).toEqual({
      organizationId: "00000000-0000-4000-8000-000000000001",
      decision: "START_REVIEW",
      reason: "Başvuru incelemeye alındı."
    });
  });
});
