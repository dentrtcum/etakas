import { describe, expect, it } from "vitest";
import { createAuditEventDraft } from "@/modules/audit/audit-summary";

describe("audit summary", () => {
  it("keeps event payloads free of implicit secrets", () => {
    expect(
      createAuditEventDraft({
        actor: {
          id: "admin-1",
          email: "admin@example.invalid",
          roles: ["ADMIN_REVIEWER"],
          organizationIds: [],
          totpEnabled: true
        },
        action: "ORGANIZATION_REVIEW_APPROVED",
        targetType: "organization",
        targetId: "org-1",
        reason: "Belgeler sentetik test için uygun."
      })
    ).toMatchObject({
      actorUserId: "admin-1",
      action: "ORGANIZATION_REVIEW_APPROVED",
      reason: "Belgeler sentetik test için uygun."
    });
  });
});
