import {
  adminRoles,
  hasAnyRole,
  isAdmin,
  type AppRole,
  type AppSessionUser
} from "@/lib/auth/roles";

export type AuthorizationResult =
  { allowed: true } | { allowed: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" };

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

  return { allowed: true };
}

export function requireOrganizationAccess(
  user: AppSessionUser | null | undefined,
  organizationId: string,
  allowedRoles: readonly AppRole[]
): AuthorizationResult {
  if (!user) return { allowed: false, reason: "UNAUTHENTICATED" };

  if (isAdmin(user)) {
    return { allowed: true };
  }

  if (
    user.organizationIds.includes(organizationId) &&
    user.organizationRoles?.[organizationId]?.some((role) => allowedRoles.includes(role))
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "FORBIDDEN" };
}
