export const organizationRoles = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_MANAGER",
  "INVENTORY_MANAGER",
  "ORDER_MANAGER",
  "VIEWER"
] as const;

export const adminRoles = ["SUPER_ADMIN"] as const;

export type OrganizationRole = (typeof organizationRoles)[number];
export type AdminRole = (typeof adminRoles)[number];
// Legacy enum values stay readable, but do not grant administration rights.
export type AppRole =
  | OrganizationRole
  | AdminRole
  | "ADMIN_REVIEWER"
  | "LISTING_REVIEWER"
  | "SUPPORT_ADMIN"
  | "LEDGER_ADMIN"
  | "AUDITOR";

export type AppSessionUser = {
  id: string;
  email: string;
  roles: AppRole[];
  organizationIds: string[];
  totpEnabled: boolean;
  organizationRoles?: Record<string, OrganizationRole[]>;
};

export function isAdminRole(role: AppRole): role is AdminRole {
  return adminRoles.includes(role as AdminRole);
}

export function hasAnyRole(
  user: AppSessionUser | null | undefined,
  allowedRoles: readonly AppRole[]
) {
  return isAdmin(user) || Boolean(user?.roles.some((role) => allowedRoles.includes(role)));
}

export function isAdmin(user: AppSessionUser | null | undefined) {
  return Boolean(user?.roles.some(isAdminRole));
}
