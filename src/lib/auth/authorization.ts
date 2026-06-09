import {
  adminRoles,
  hasAnyRole,
  isAdmin,
  requiresAdminTotp,
  type AppRole,
  type AppSessionUser
} from "@/lib/auth/roles";

export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" | "ADMIN_TOTP_REQUIRED" };

export function requireAuthenticated(user: AppSessionUser | null | undefined): AuthorizationResult {
  return user ? { allowed: true } : { allowed: false, reason: "UNAUTHENTICATED" };
}

export function requireRoles(
  user: AppSessionUser | null | undefined,
  allowedRoles: readonly AppRole[]
): AuthorizationResult {
  const authenticated = requireAuthenticated(user);
  if (!authenticated.allowed) return authenticated;

  if (hasAnyRole(user, allowedRoles)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "FORBIDDEN" };
}

export function requireAdmin(user: AppSessionUser | null | undefined): AuthorizationResult {
  const roleResult = requireRoles(user, adminRoles);
  if (!roleResult.allowed) return roleResult;

  if (requiresAdminTotp(user)) {
    return { allowed: false, reason: "ADMIN_TOTP_REQUIRED" };
  }

  return { allowed: true };
}

export function requireOrganizationAccess(
  user: AppSessionUser | null | undefined,
  organizationId: string,
  allowedRoles: readonly AppRole[]
): AuthorizationResult {
  const roleResult = requireRoles(user, allowedRoles);
  if (!roleResult.allowed) return roleResult;

  if (isAdmin(user)) {
    return { allowed: true };
  }

  if (user?.organizationIds.includes(organizationId)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "FORBIDDEN" };
}
