import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/lib/db/client";
import { organizationMembers, userRoles, users } from "@/lib/db/schema";
import { getSessionUserIdFromCookie } from "@/lib/auth/app-session";
import {
  organizationRoles,
  type OrganizationRole,
  type AppRole,
  type AppSessionUser
} from "@/lib/auth/roles";
import { serverEnv } from "@/lib/env";

export const getCurrentAppUser = cache(async (): Promise<AppSessionUser | null> => {
  const userId = await getSessionUserIdFromCookie();

  if (!userId || !serverEnv.DATABASE_URL) {
    return null;
  }

  const db = getDb();
  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      totpEnabled: users.totpEnabled
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!dbUser) {
    return null;
  }

  const globalRoles = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  const memberships = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  const roles = [
    ...globalRoles.filter((row) => row.role === "SUPER_ADMIN").map((row) => row.role),
    ...memberships
      .filter((row) => organizationRoles.includes(row.role as OrganizationRole))
      .map((row) => row.role)
  ] as AppRole[];

  return {
    id: dbUser.id,
    email: dbUser.email,
    roles,
    organizationIds: memberships
      .filter((membership) => organizationRoles.includes(membership.role as OrganizationRole))
      .map((membership) => membership.organizationId),
    organizationRoles: memberships.reduce<Record<string, OrganizationRole[]>>(
      (result, membership) => {
        if (organizationRoles.includes(membership.role as OrganizationRole))
          (result[membership.organizationId] ??= []).push(membership.role as OrganizationRole);
        return result;
      },
      {}
    ),
    totpEnabled: dbUser.totpEnabled
  };
});
