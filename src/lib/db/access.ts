import { getCurrentAppUser } from "@/lib/auth/current-user";
import { requireAdmin, requireOrganizationAccess } from "@/lib/auth/authorization";
import { SecurityError } from "@/lib/security/request-guards";

export async function assertAdminRead() {
  const actor = await getCurrentAppUser();
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  return actor!;
}
export async function assertOrganizationRead(organizationId: string) {
  const actor = await getCurrentAppUser();
  if (
    !requireOrganizationAccess(actor, organizationId, [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_MANAGER",
      "INVENTORY_MANAGER",
      "ORDER_MANAGER",
      "VIEWER"
    ]).allowed
  ) {
    throw new SecurityError("FORBIDDEN", 403);
  }
  return actor!;
}
