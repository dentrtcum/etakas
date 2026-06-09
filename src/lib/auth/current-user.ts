import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { organizationMembers, userRoles, users } from "@/lib/db/schema";
import { getCurrentAuthSession } from "@/lib/auth/session";
import { isAdminRole, type AppRole, type AppSessionUser } from "@/lib/auth/roles";
import { serverEnv } from "@/lib/env";

type AuthSessionShape = {
  user?: {
    id?: string;
    email?: string;
  };
} | null;

export async function getCurrentAppUser(): Promise<AppSessionUser | null> {
  const session = (await getCurrentAuthSession()) as AuthSessionShape;
  const userId = session?.user?.id;

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

  const globalRoles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
  const memberships = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  const roles = [...globalRoles.map((row) => row.role), ...memberships.map((row) => row.role)] as AppRole[];

  return {
    id: dbUser.id,
    email: dbUser.email,
    roles,
    organizationIds: memberships
      .filter((membership) => !isAdminRole(membership.role as AppRole))
      .map((membership) => membership.organizationId),
    totpEnabled: dbUser.totpEnabled
  };
}
