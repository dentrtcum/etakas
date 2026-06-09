import { describe, expect, it } from "vitest";
import { requireAdmin, requireOrganizationAccess, requireRoles } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";

const orgUser: AppSessionUser = {
  id: "user-1",
  email: "owner@example.invalid",
  roles: ["ORGANIZATION_OWNER"],
  organizationIds: ["org-1"],
  totpEnabled: false
};

const adminUser: AppSessionUser = {
  id: "admin-1",
  email: "admin@example.invalid",
  roles: ["ADMIN_REVIEWER"],
  organizationIds: [],
  totpEnabled: true
};

describe("authorization", () => {
  it("denies unauthenticated users", () => {
    expect(requireRoles(null, ["ORGANIZATION_OWNER"])).toEqual({
      allowed: false,
      reason: "UNAUTHENTICATED"
    });
  });

  it("requires matching roles", () => {
    expect(requireRoles(orgUser, ["ORGANIZATION_OWNER"])).toEqual({ allowed: true });
    expect(requireRoles(orgUser, ["LEDGER_ADMIN"])).toEqual({ allowed: false, reason: "FORBIDDEN" });
  });

  it("keeps organization users inside their own organization", () => {
    expect(requireOrganizationAccess(orgUser, "org-1", ["ORGANIZATION_OWNER"])).toEqual({
      allowed: true
    });
    expect(requireOrganizationAccess(orgUser, "org-2", ["ORGANIZATION_OWNER"])).toEqual({
      allowed: false,
      reason: "FORBIDDEN"
    });
  });

  it("requires TOTP for admin access", () => {
    expect(requireAdmin({ ...adminUser, totpEnabled: false })).toEqual({
      allowed: false,
      reason: "ADMIN_TOTP_REQUIRED"
    });
    expect(requireAdmin(adminUser)).toEqual({ allowed: true });
  });
});
