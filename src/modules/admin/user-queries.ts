import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, userRoles } from "@/lib/db/schema";
import { assertAdminRead } from "@/lib/db/access";

export async function listAdminUsers(page = 1) {
  await assertAdminRead();
  return getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      lockedUntil: users.lockedUntil,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      superAdmin: sql<boolean>`exists(select 1 from ${userRoles} where ${userRoles.userId} = ${users.id} and ${userRoles.role} = 'SUPER_ADMIN')`
    })
    .from(users)
    .orderBy(desc(users.createdAt), users.id)
    .limit(21)
    .offset((page - 1) * 20);
}
