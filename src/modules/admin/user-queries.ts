import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  organizationMembers,
  organizations,
  productCatalog,
  users,
  userRoles
} from "@/lib/db/schema";
import { assertAdminRead } from "@/lib/db/access";

export async function listAdminUsers(page = 1) {
  await assertAdminRead();
  const superAdmin = sql<boolean>`exists(
    select 1
    from ${userRoles}
    where ${userRoles.userId} = ${users.id}
      and ${userRoles.role} = 'SUPER_ADMIN'
  )`;
  const hasOpenOrganization = sql<boolean>`exists(
    select 1
    from ${organizationMembers}
    inner join ${organizations}
      on ${organizations.id} = ${organizationMembers.organizationId}
    where ${organizationMembers.userId} = ${users.id}
      and ${organizations.status} <> 'CLOSED'
  )`;

  return getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      lockedUntil: users.lockedUntil,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      superAdmin
    })
    .from(users)
    .where(sql`${superAdmin} or ${hasOpenOrganization}`)
    .orderBy(desc(users.createdAt), users.id)
    .limit(21)
    .offset((page - 1) * 20);
}

export async function listAdminOrganizations() {
  await assertAdminRead();
  return getDb()
    .select({ id: organizations.id, name: organizations.publicAlias, status: organizations.status })
    .from(organizations)
    .orderBy(organizations.publicAlias);
}

export async function listProductCatalog(page = 1) {
  await assertAdminRead();
  return getDb()
    .select()
    .from(productCatalog)
    .where(eq(productCatalog.source, "MANUAL"))
    .orderBy(desc(productCatalog.updatedAt), productCatalog.name)
    .limit(51)
    .offset((page - 1) * 50);
}
