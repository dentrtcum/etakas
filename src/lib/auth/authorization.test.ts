import { describe, expect, it } from "vitest";
import { requireAdmin, requireOrganizationAccess, requireRoles } from "@/lib/auth/authorization";
import type { AppSessionUser } from "@/lib/auth/roles";

const orgUser: AppSessionUser = {
  id: "user-1",
  email: "owner@example.invalid",
  roles: ["ORGANIZATION_OWNER"],
  organizationIds: ["org-1"],
  organizationRoles: { "org-1": ["ORGANIZATION_OWNER"] },
  totpEnabled: false
};

const adminUser: AppSessionUser = {
  id: "admin-1",
  email: "admin@example.invalid",
  roles: ["SUPER_ADMIN"],
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
    expect(requireRoles(orgUser, ["LEDGER_ADMIN"])).toEqual({
      allowed: false,
      reason: "FORBIDDEN"
    });
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

  it("only grants administration to the super admin, independently of legacy TOTP flags", () => {
    expect(requireAdmin({ ...adminUser, totpEnabled: false })).toEqual({ allowed: true });
    expect(requireAdmin(adminUser)).toEqual({ allowed: true });
    expect(requireAdmin(orgUser)).toEqual({ allowed: false, reason: "FORBIDDEN" });
    for (const role of [
      "ADMIN_REVIEWER",
      "LISTING_REVIEWER",
      "SUPPORT_ADMIN",
      "LEDGER_ADMIN",
      "AUDITOR"
    ] as const) {
      expect(requireAdmin({ ...adminUser, roles: [role] })).toEqual({
        allowed: false,
        reason: "FORBIDDEN"
      });
    }
    expect(requireAdmin(null)).toEqual({ allowed: false, reason: "UNAUTHENTICATED" });
  });

  it("does not allow a role from one organization to authorize a different organization", () => {
    const mixedUser: AppSessionUser = {
      ...orgUser,
      organizationIds: ["org-1", "org-2"],
      roles: ["ORGANIZATION_OWNER", "VIEWER"],
      organizationRoles: { "org-1": ["ORGANIZATION_OWNER"], "org-2": ["VIEWER"] }
    };
    expect(requireOrganizationAccess(mixedUser, "org-2", ["ORGANIZATION_OWNER"])).toEqual({
      allowed: false,
      reason: "FORBIDDEN"
    });
    expect(requireOrganizationAccess(mixedUser, "org-2", ["VIEWER"])).toEqual({ allowed: true });
    expect(
      requireOrganizationAccess({ ...orgUser, organizationRoles: undefined }, "org-1", [
        "ORGANIZATION_OWNER"
      ])
    ).toEqual({ allowed: false, reason: "FORBIDDEN" });
  });

  it("allows the super admin to administer every organization", () => {
    expect(
      requireOrganizationAccess(adminUser, "unrelated-organization", ["ORGANIZATION_OWNER"])
    ).toEqual({ allowed: true });
    expect(requireRoles(adminUser, ["LEDGER_ADMIN"])).toEqual({ allowed: true });
  });
});
